import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, Plus, RefreshCw, TrendingDown, TrendingUp, Wallet as WalletIcon, XCircle } from "lucide-react";
import { walletService, safeNumber } from "../../services/wallet.service";
import type { LedgerEntry, WalletHold } from "../../services/wallet.service";
import { useAuth } from "../../contexts/AuthContext";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { ActionButton, DataCard, EmptyState, Field, ItemRow, PageHeader, PanelForm, Pagination, StatusChip, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD_SOFT, ROW_HOVER, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { DetailsSkeleton, ListSkeleton } from "../../components/ui/Skeleton";
import { Toaster } from "../../components/ui/Toaster";
import { toast } from "../../components/ui/toastStore";
import { KpiRow } from "../../components/operations/OpsCharts";
import { WalletSecurityPanel } from "../../components/wallet/control/WalletSecurityPanel";
import { WalletActionsPanel } from "../../components/wallet/control/WalletActionsPanel";
import { WalletCompliancePanel } from "../../components/wallet/control/WalletCompliancePanel";
import { CaseDetail } from "./compliance/CaseDetail";
import { currencyLabel } from "../../components/payment/paymentUtils";
import { ENTRY_TYPE_LABEL, HOLD_STATUS_LABEL, HOLD_STATUS_TONE, OWNER_TYPE_LABEL, WALLET_STATUS_LABEL, WALLET_STATUS_TONE } from "../../components/wallet/walletLabels";

const PAGE_SIZE = 20;
const GREEN = "#7FB08A";
const PINK = "var(--logo-pink)";

type Tab = "ledger" | "holds" | "security" | "actions" | "compliance";

const buildDefaultHoldForm = () => {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return { amount: 0, sourceType: "BOOKING", sourceCode: "", expiresAt: d.toISOString().slice(0, 16) };
};

export const WalletDetailModal: React.FC = () => {
  const { walletNumber } = useParams<{ walletNumber: string }>();
  const navigate = useNavigate();
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>("ledger");
  const [ledgerPage, setLedgerPage] = useState(0);
  const [isCreateHoldOpen, setIsCreateHoldOpen] = useState(false);
  const [holdForm, setHoldForm] = useState(buildDefaultHoldForm);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [openCase, setOpenCase] = useState<string | null>(null);

  const { data: wallet, isLoading: walletLoading, isError: walletError, isFetching: walletFetching, refetch: refetchWallet } = useQuery({
    queryKey: ["wallet", walletNumber],
    queryFn: () => walletService.getWallet(walletNumber!),
    enabled: !!walletNumber,
  });

  // Les deux listes sont chargées d'emblée : leur effectif s'affiche dans les onglets, il restait à 0 tant que l'onglet n'était pas ouvert.
  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ["wallet-ledger", walletNumber, ledgerPage],
    queryFn: () => walletService.getLedgerEntries(walletNumber!, { page: ledgerPage, size: PAGE_SIZE, sort: "createdAt,desc" }),
    enabled: !!walletNumber,
  });
  const { data: holdsData, isLoading: holdsLoading } = useQuery({
    queryKey: ["wallet-holds", walletNumber],
    queryFn: () => walletService.getWalletHolds(walletNumber!, { size: 100 }),
    enabled: !!walletNumber,
  });

  const ledgerEntries: LedgerEntry[] = ledgerData?.content ?? [];
  const totalElements = ledgerData?.totalElements ?? 0;
  const totalPages = ledgerData?.totalPages ?? Math.ceil(totalElements / PAGE_SIZE);
  const holds: WalletHold[] = holdsData?.content ?? [];

  const invalidate = () => {
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
      invalidate();
      setIsCreateHoldOpen(false);
      setHoldForm(buildDefaultHoldForm());
      setHoldError(null);
      toast.success("Réservation créée.");
    },
    onError: (e: unknown) => setHoldError(apiMessage(e, "Erreur lors de la création de la réservation.")),
  });

  const createdBy = admin?.email || "admin";
  const confirmCapture = (hold: WalletHold, cur: string) =>
    toast.confirm({
      message: `Capturer ${hold.holdNumber} ?`,
      detail: `Débit définitif de ${formatMoney(hold.amount, cur)} sur le portefeuille.`,
      confirmLabel: "Capturer",
      pendingLabel: "Capture",
      successMessage: "Réservation capturée.",
      errorMessage: "Erreur lors de la capture de la réservation.",
      onConfirm: async () => {
        await walletService.captureHold(hold.holdNumber, createdBy);
        invalidate();
      },
    });
  const confirmRelease = (hold: WalletHold, cur: string) =>
    toast.confirm({
      message: `Libérer ${hold.holdNumber} ?`,
      detail: `${formatMoney(hold.amount, cur)} retournent dans le solde disponible.`,
      confirmLabel: "Libérer",
      pendingLabel: "Libération",
      successMessage: "Réservation libérée.",
      errorMessage: "Erreur lors de la libération de la réservation.",
      onConfirm: async () => {
        await walletService.releaseHold(hold.holdNumber, createdBy);
        invalidate();
      },
    });

  const ledgerStats = useMemo(
    () =>
      ledgerEntries.reduce(
        (acc, e) => {
          if (e.direction === "CREDIT") acc.credit += safeNumber(e.amount);
          else acc.debit += safeNumber(e.amount);
          return acc;
        },
        { credit: 0, debit: 0 },
      ),
    [ledgerEntries],
  );

  const shell = (children: React.ReactNode) => (
    <AdminLayout>
      <div style={brandVars}>
        <Toaster />
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </div>
    </AdminLayout>
  );

  if (walletLoading) return shell(<DetailsSkeleton />);
  if (walletError || !wallet) {
    return shell(
      <EmptyState
        icon={WalletIcon}
        title="Portefeuille introuvable"
        hint="Il a peut-être été supprimé, ou le numéro est incorrect."
        action={<ActionButton onClick={() => navigate("/wallets")}>Retour aux portefeuilles</ActionButton>}
      />,
    );
  }

  const cur = currencyLabel(wallet.currency);
  const available = safeNumber(wallet.availableBalance);
  const held = safeNumber(wallet.heldBalance);
  const ledger = safeNumber(wallet.ledgerBalance);
  const base = Math.max(available + held, ledger, 1);
  const tabs: TabItem<Tab>[] = [
    { id: "ledger", label: "Historique", count: totalElements },
    { id: "holds", label: "Réservations", count: holds.length },
    { id: "security", label: "Sécurité" },
    { id: "actions", label: "Actions" },
    { id: "compliance", label: "Conformité" },
  ];

  return shell(
    <div className="space-y-5">
      <PageHeader
        title={wallet.walletNumber}
        subtitle={`${OWNER_TYPE_LABEL[wallet.ownerType] ?? wallet.ownerType} · ${wallet.ownerCode}`}
        onBack={() => navigate("/wallets")}
        backLabel="Retour aux portefeuilles"
        badge={<StatusChip tone={WALLET_STATUS_TONE[wallet.status] ?? "neutral"}>{WALLET_STATUS_LABEL[wallet.status] ?? wallet.status}</StatusChip>}
        actions={
          <ActionButton variant="ghost" icon={RefreshCw} pending={walletFetching} onClick={() => refetchWallet()}>
            Actualiser
          </ActionButton>
        }
      />

      <div className="space-y-3">
        <KpiRow
          columns={3}
          items={[
            { label: "Disponible", value: formatMoney(available, cur), tone: "success" },
            { label: "Bloqué", value: formatMoney(held, cur), tone: "pink" },
            { label: "Solde ledger", value: formatMoney(ledger, cur) },
          ]}
        />
        <div className="px-2">
          <div className="flex h-3 overflow-hidden rounded-full bg-gray-100" role="img" aria-label="Répartition du solde entre disponible et bloqué">
            <div style={{ width: `${(available / base) * 100}%`, backgroundColor: GREEN }} />
            <div style={{ width: `${(held / base) * 100}%`, backgroundColor: PINK }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GREEN }} /> Disponible
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PINK }} /> Bloqué
            </span>
          </div>
        </div>
      </div>

      <Tabs variant="soft" items={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === "ledger" && (
        <div className="space-y-4">
          {ledgerEntries.length > 0 && (
            <KpiRow
              columns={3}
              items={[
                { label: "Crédits de la page", value: formatMoney(ledgerStats.credit, cur), tone: "success" },
                { label: "Débits de la page", value: formatMoney(ledgerStats.debit, cur), tone: "danger" },
                { label: "Mouvements", value: totalElements.toLocaleString("fr-FR") },
              ]}
            />
          )}
          {ledgerLoading ? (
            <ListSkeleton rows={6} />
          ) : ledgerEntries.length === 0 ? (
            <EmptyState icon={WalletIcon} title="Aucune transaction" hint="Les mouvements du portefeuille apparaîtront ici." />
          ) : (
            <>
              <DataCard>
                {ledgerEntries.map((e) => {
                  const credit = e.direction === "CREDIT";
                  return (
                    <div key={e.entryNumber} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 transition ${ROW_HOVER}`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${credit ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                          {credit ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{ENTRY_TYPE_LABEL[e.entryType] ?? e.entryType}</p>
                          <p className="text-xs text-gray-500">
                            {e.sourceCode && <span className="font-mono">{e.sourceCode} · </span>}
                            {formatDateTime(e.createdAt)}
                          </p>
                          {e.reference && <p className="text-xs text-gray-400">Réf. {e.reference}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold tabular-nums ${credit ? "text-emerald-700" : "text-red-600"}`}>
                          {credit ? "+" : "-"}
                          {formatMoney(e.amount, currencyLabel(e.currency))}
                        </p>
                        <p className="text-xs tabular-nums text-gray-400">Solde {formatMoney(e.balanceAfter, currencyLabel(e.currency))}</p>
                      </div>
                    </div>
                  );
                })}
              </DataCard>
              <Pagination page={ledgerPage} totalPages={totalPages} total={totalElements} noun="mouvement" onChange={setLedgerPage} />
            </>
          )}
        </div>
      )}

      {activeTab === "holds" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">Réservations de fonds sur ce portefeuille</p>
            <ActionButton icon={Plus} onClick={() => setIsCreateHoldOpen(!isCreateHoldOpen)}>
              Nouvelle réservation
            </ActionButton>
          </div>

          {isCreateHoldOpen && (
            <PanelForm
              title="Nouvelle réservation"
              submitLabel="Créer la réservation"
              pending={createHoldMutation.isPending}
              error={holdError}
              onCancel={() => setIsCreateHoldOpen(false)}
              onSubmit={(e) => {
                e.preventDefault();
                if (holdForm.amount <= 0 || !holdForm.sourceCode) return setHoldError("Le montant et le code source sont obligatoires.");
                if (holdForm.amount > available) return setHoldError(`Montant supérieur au solde disponible (${formatMoney(available, cur)}).`);
                setHoldError(null);
                createHoldMutation.mutate();
              }}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label={`Montant (${cur})`} required>
                  <input
                    inputMode="decimal"
                    value={holdForm.amount === 0 ? "" : holdForm.amount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, "");
                      setHoldForm({ ...holdForm, amount: v === "" ? 0 : parseFloat(v) });
                    }}
                    placeholder="0"
                    className={FIELD_SOFT}
                  />
                </Field>
                <Field label="Type de source">
                  <select value={holdForm.sourceType} onChange={(e) => setHoldForm({ ...holdForm, sourceType: e.target.value })} className={FIELD_SOFT}>
                    <option value="BOOKING">Réservation</option>
                    <option value="PAYMENT">Paiement</option>
                    <option value="CAUTION">Caution</option>
                    <option value="SUBSCRIPTION">Abonnement</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </Field>
                <Field label="Code source" required>
                  <input value={holdForm.sourceCode} onChange={(e) => setHoldForm({ ...holdForm, sourceCode: e.target.value })} placeholder="BKG-000001" className={`${FIELD_SOFT} font-mono`} />
                </Field>
                <Field label="Expiration" required>
                  <input type="datetime-local" value={holdForm.expiresAt} onChange={(e) => setHoldForm({ ...holdForm, expiresAt: e.target.value })} className={FIELD_SOFT} />
                </Field>
              </div>
            </PanelForm>
          )}

          {holdsLoading ? (
            <ListSkeleton rows={3} />
          ) : holds.length === 0 ? (
            <EmptyState icon={Clock} title="Aucune réservation" hint="Les fonds réservés sur ce portefeuille apparaîtront ici." />
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {holds.map((hold) => {
                const isActive = hold.status === "ACTIVE";
                const isExpired = new Date(hold.expiresAt) < new Date();
                return (
                  <ItemRow key={hold.holdNumber} className={!isActive ? "opacity-70" : ""}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold text-gray-900">{hold.holdNumber}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {hold.sourceType} · {hold.sourceCode}
                        </p>
                        <p className={`mt-0.5 text-xs ${isExpired && isActive ? "font-semibold text-red-600" : "text-gray-400"}`}>
                          Expire le {formatDateTime(hold.expiresAt)}
                          {isExpired && isActive && " (dépassé)"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-base font-bold tabular-nums text-[color:var(--logo-pink-dark)]">{formatMoney(hold.amount, cur)}</p>
                        <StatusChip tone={HOLD_STATUS_TONE[hold.status] ?? "neutral"}>{HOLD_STATUS_LABEL[hold.status] ?? hold.status}</StatusChip>
                      </div>
                    </div>
                    {isActive && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <ActionButton icon={CheckCircle} className="!px-4 !py-2" onClick={() => confirmCapture(hold, cur)}>
                          Capturer
                        </ActionButton>
                        <ActionButton variant="ghost" icon={XCircle} className="!px-4 !py-2" onClick={() => confirmRelease(hold, cur)}>
                          Libérer
                        </ActionButton>
                      </div>
                    )}
                  </ItemRow>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "security" && <WalletSecurityPanel walletNumber={wallet.walletNumber} />}
      {activeTab === "actions" && <WalletActionsPanel walletNumber={wallet.walletNumber} currency={cur} />}
      {activeTab === "compliance" &&
        (openCase ? (
          <CaseDetail caseNumber={openCase} onBack={() => setOpenCase(null)} />
        ) : (
          <WalletCompliancePanel walletNumber={wallet.walletNumber} onOpenCase={setOpenCase} />
        ))}
    </div>,
  );
};
