import React, { useEffect, useMemo, useState } from "react";
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
  Lock,
  Layers,
  X,
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
  ACTIVE: { label: "Actif", color: "bg-blue-50 text-blue-700 ring-blue-100" },
  CAPTURED: { label: "Capturé", color: "bg-green-50 text-green-700 ring-green-100" },
  RELEASED: { label: "Libéré", color: "bg-gray-50 text-gray-500 ring-gray-100" },
  EXPIRED: { label: "Expiré", color: "bg-red-50 text-red-700 ring-red-100" },
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

  const [activeTab, setActiveTab] = useState<"ledger" | "holds">("ledger");
  const [ledgerPage, setLedgerPage] = useState(0);
  const [isCreateHoldOpen, setIsCreateHoldOpen] = useState(false);
  const [holdForm, setHoldForm] = useState(buildDefaultHoldForm);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
  const totalPages = ledgerData?.totalPages ?? Math.ceil(totalElements / PAGE_SIZE);
  const holds: WalletHold[] = holdsData?.content || [];

  useEffect(() => {
    setLedgerPage(0);
  }, [activeTab]);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["wallet", walletNumber] });
    queryClient.invalidateQueries({ queryKey: ["wallet-ledger", walletNumber] });
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
      setHoldError(error?.response?.data?.message || "Erreur lors de la création du hold.");
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
      setActionError(error?.response?.data?.message || "Erreur lors de la capture du hold.");
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
      setActionError(error?.response?.data?.message || "Erreur lors de la libération du hold.");
    },
  });

  const anyPending = captureMutation.isPending || releaseMutation.isPending;
  const availableBalance = safeNumber(wallet?.availableBalance);
  const heldBalance = safeNumber(wallet?.heldBalance);
  const ledgerBalance = safeNumber(wallet?.ledgerBalance);
  const totalForBars = Math.max(availableBalance + heldBalance, ledgerBalance, 1);
  const availablePct = Math.max(0, Math.min(100, (availableBalance / totalForBars) * 100));
  const heldPct = Math.max(0, Math.min(100, (heldBalance / totalForBars) * 100));

  const ledgerStats = useMemo(() => {
    return ledgerEntries.reduce(
      (acc, entry) => {
        if (entry.direction === "CREDIT") acc.credit += safeNumber(entry.amount);
        else acc.debit += safeNumber(entry.amount);
        return acc;
      },
      { credit: 0, debit: 0 },
    );
  }, [ledgerEntries]);

  if (walletLoading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={32} className="animate-spin text-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  if (walletError || !wallet) {
    return (
      <AdminLayout>
        <div className="rounded-2xl bg-white py-14 text-center shadow-sm ring-1 ring-gray-100">
          <WalletIcon size={48} className="mx-auto mb-4 text-gray-300" />
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
      <div className="mb-6">
        <button
          onClick={() => navigate("/wallets")}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft size={17} />
          Retour aux portefeuilles
        </button>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                Portefeuille
              </p>
              <h1 className="font-mono text-2xl font-bold text-gray-900">{wallet.walletNumber}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {wallet.ownerType} · {wallet.ownerCode}
              </p>
            </div>
            <button
              onClick={() => refetchWallet()}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              title="Actualiser"
            >
              <RefreshCw size={17} />
              Actualiser
            </button>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-gray-100">
            <div className="flex h-full">
              <div className="bg-green-500" style={{ width: `${availablePct}%` }} />
              <div className="bg-orange-400" style={{ width: `${heldPct}%` }} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              Disponible
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
              Bloqué
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <BalanceCard label="Solde disponible" value={formatAmount(wallet.availableBalance, wallet.currency)} tone="green" icon={TrendingUp} />
        <BalanceCard label="Solde bloqué" value={formatAmount(wallet.heldBalance, wallet.currency)} tone="orange" icon={Lock} />
        <BalanceCard label="Solde ledger" value={formatAmount(wallet.ledgerBalance, wallet.currency)} tone="gray" icon={Layers} />
      </div>

      {actionError && (
        <div className="mb-6 flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700">
            <XCircle size={16} />
          </button>
        </div>
      )}

      <div className="mb-6 inline-flex rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-gray-100">
        <button
          onClick={() => setActiveTab("ledger")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "ledger"
              ? "bg-primary-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Historique ({totalElements})
        </button>
        <button
          onClick={() => setActiveTab("holds")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "holds"
              ? "bg-primary-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Holds ({holds.length})
        </button>
      </div>

      {activeTab === "ledger" && (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <MiniStat label="Crédits affichés" value={`${formatAmountOnly(ledgerStats.credit)} ${wallet.currency}`} tone="green" />
            <MiniStat label="Débits affichés" value={`${formatAmountOnly(ledgerStats.debit)} ${wallet.currency}`} tone="red" />
          </div>

          {ledgerLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : ledgerEntries.length === 0 ? (
            <div className="py-12 text-center">
              <WalletIcon size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Aucune transaction</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {ledgerEntries.map((entry) => (
                  <div
                    key={entry.entryNumber}
                    className="flex items-center justify-between rounded-2xl bg-gray-50 p-4 transition hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-xl p-2 ${
                          entry.direction === "CREDIT"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {entry.direction === "CREDIT" ? (
                          <TrendingUp size={18} />
                        ) : (
                          <TrendingDown size={18} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {entryTypeLabels[entry.entryType] || entry.entryType}
                        </p>
                        <p className="text-xs text-gray-500">
                          {entry.sourceCode && <span className="font-mono">{entry.sourceCode} · </span>}
                          {new Date(entry.createdAt).toLocaleString("fr-FR")}
                        </p>
                        {entry.reference && (
                          <p className="mt-0.5 text-xs text-gray-400">Réf: {entry.reference}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p
                        className={`text-sm font-bold ${
                          entry.direction === "CREDIT" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {entry.direction === "CREDIT" ? "+" : "-"}
                        {formatAmountOnly(entry.amount)} {entry.currency}
                      </p>
                      <p className="text-xs text-gray-400">
                        Solde: {formatAmountOnly(entry.balanceAfter)} {entry.currency}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                  <p className="text-sm text-gray-500">
                    Page {ledgerPage + 1} / {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLedgerPage((p) => Math.max(0, p - 1))}
                      disabled={ledgerPage === 0}
                      className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-gray-100 disabled:opacity-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setLedgerPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={ledgerPage >= totalPages - 1}
                      className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-gray-100 disabled:opacity-50"
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

      {activeTab === "holds" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">Réservations de fonds sur ce portefeuille</p>
            <button
              onClick={() => setIsCreateHoldOpen(true)}
              className="inline-flex items-center gap-1 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
            >
              <Plus size={14} /> Nouveau hold
            </button>
          </div>

          {holdsLoading ? (
            <div className="flex justify-center rounded-2xl bg-white py-12 shadow-sm ring-1 ring-gray-100">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : holds.length === 0 ? (
            <div className="rounded-2xl bg-white py-12 text-center shadow-sm ring-1 ring-gray-100">
              <Clock size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Aucun hold actif</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {holds.map((hold) => {
                const hs = holdStatusConfig[hold.status] || {
                  label: hold.status,
                  color: "bg-gray-50 text-gray-500 ring-gray-100",
                };
                const isActive = hold.status === "ACTIVE";
                const isExpired = new Date(hold.expiresAt) < new Date();
                return (
                  <div
                    key={hold.holdNumber}
                    className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 ${!isActive ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-semibold text-gray-900">{hold.holdNumber}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {hold.sourceType} · {hold.sourceCode}
                        </p>
                        <p className={`mt-0.5 text-xs ${isExpired && isActive ? "text-red-500" : "text-gray-400"}`}>
                          Expire le : {new Date(hold.expiresAt).toLocaleString("fr-FR")}
                          {isExpired && isActive && " (expiré)"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">
                          {formatAmountOnly(hold.amount)} {wallet.currency}
                        </p>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${hs.color}`}>
                          {hs.label}
                        </span>
                      </div>
                    </div>

                    {isActive && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            if (confirm(`Capturer le hold ${hold.holdNumber} (débit définitif de ${formatAmountOnly(hold.amount)} ${wallet.currency}) ?`)) {
                              captureMutation.mutate(hold.holdNumber);
                            }
                          }}
                          disabled={anyPending}
                          className="inline-flex items-center justify-center gap-1 rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          {captureMutation.isPending && captureMutation.variables === hold.holdNumber ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle size={12} />
                          )}
                          Capturer
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Libérer le hold ${hold.holdNumber} (remettre ${formatAmountOnly(hold.amount)} ${wallet.currency} dans le solde disponible) ?`)) {
                              releaseMutation.mutate(hold.holdNumber);
                            }
                          }}
                          disabled={anyPending}
                          className="inline-flex items-center justify-center gap-1 rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
                        >
                          {releaseMutation.isPending && releaseMutation.variables === hold.holdNumber ? (
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

          {isCreateHoldOpen && (
            <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-blue-100">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Nouveau hold</p>
                <button onClick={() => setIsCreateHoldOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                  <X size={16} />
                </button>
              </div>
              {holdError && (
                <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">
                  {holdError}
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Montant (FCFA) *">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={holdForm.amount === 0 ? "" : holdForm.amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d.]/g, "");
                      setHoldForm({ ...holdForm, amount: val === "" ? 0 : parseFloat(val) });
                    }}
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
                  />
                </Field>
                <Field label="Type de source">
                  <select
                    value={holdForm.sourceType}
                    onChange={(e) => setHoldForm({ ...holdForm, sourceType: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
                  >
                    <option value="BOOKING">Réservation</option>
                    <option value="PAYMENT">Paiement</option>
                    <option value="CAUTION">Caution</option>
                    <option value="SUBSCRIPTION">Abonnement</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </Field>
                <Field label="Code source *">
                  <input
                    type="text"
                    value={holdForm.sourceCode}
                    placeholder="BKG-000001"
                    onChange={(e) => setHoldForm({ ...holdForm, sourceCode: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
                  />
                </Field>
                <Field label="Expiration *">
                  <input
                    type="datetime-local"
                    value={holdForm.expiresAt}
                    onChange={(e) => setHoldForm({ ...holdForm, expiresAt: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
                  />
                </Field>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setIsCreateHoldOpen(false)}
                  disabled={createHoldMutation.isPending}
                  className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
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
                      setHoldError(`Montant supérieur au solde disponible (${formatAmountOnly(availableBalance)} FCFA).`);
                      return;
                    }
                    createHoldMutation.mutate();
                  }}
                  disabled={createHoldMutation.isPending}
                  className="flex-1 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
                >
                  {createHoldMutation.isPending ? <Loader2 size={14} className="mx-auto animate-spin" /> : "Créer le hold"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

const BalanceCard: React.FC<{
  label: string;
  value: string;
  tone: "green" | "orange" | "gray";
  icon: React.ElementType;
}> = ({ label, value, tone, icon: Icon }) => {
  const cls =
    tone === "green"
      ? "bg-green-50 text-green-700"
      : tone === "orange"
        ? "bg-orange-50 text-orange-700"
        : "bg-gray-50 text-gray-700";
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <span className={`rounded-xl p-2 ${cls}`}>
          <Icon size={17} />
        </span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: string; tone: "green" | "red" }> = ({
  label,
  value,
  tone,
}) => (
  <div className={`rounded-2xl px-4 py-3 ${tone === "green" ? "bg-green-50" : "bg-red-50"}`}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`mt-1 font-semibold ${tone === "green" ? "text-green-700" : "text-red-700"}`}>
      {value}
    </p>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
    {children}
  </label>
);
