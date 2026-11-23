import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react";
import { walletService } from "../../../services/wallet.service";
import { walletControlService } from "../../../services/walletControl.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ActionButton, ErrorBlock, Section, StatusChip } from "../../subscription/kit";
import { formatMoney } from "../../subscription/kitUtils";
import { Skeleton } from "../../ui/Skeleton";
import { toast } from "../../ui/toastStore";
import { RatioBar } from "../../operations/OpsCharts";
import { currencyLabel } from "../../payment/paymentUtils";

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-xs font-semibold text-gray-400">{label}</p>
    <p className="mt-1 text-sm font-bold tabular-nums text-gray-950">{value}</p>
  </div>
);

/** Sécurité d'un portefeuille : intégrité du ledger, plafonds appliqués et réinitialisation du code secret. */
export const WalletSecurityPanel: React.FC<{ walletNumber: string }> = ({ walletNumber }) => {
  const qc = useQueryClient();
  const { isAdmin, hasPermission } = useAuth();
  // Plafonds et intégrité : rôle ADMIN ou SUPER_ADMIN en plus du droit PAYMENT:READ.
  const allowed = isAdmin() && hasPermission("PAYMENT:READ");
  const integrity = useQuery({ queryKey: ["wallet-integrity", walletNumber], queryFn: () => walletService.getIntegrity(walletNumber), enabled: allowed });
  const limits = useQuery({ queryKey: ["wallet-limits", walletNumber], queryFn: () => walletService.getLimits(walletNumber), enabled: allowed });

  const resetMutation = useMutation({
    mutationFn: () => walletControlService.createAction(walletNumber, { type: "RESET_PIN", reason: "Réinitialisation du code secret demandée par l'administration" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet-actions"] }),
  });
  const askReset = () =>
    toast.confirm({
      message: "Réinitialiser le code secret ?",
      detail: "La demande part en attente du second visa. Une fois approuvée, le titulaire devra redéfinir son code.",
      confirmLabel: "Demander",
      pendingLabel: "Demande",
      successMessage: "Demande créée, en attente du second visa",
      errorMessage: "Demande impossible",
      onConfirm: () => resetMutation.mutateAsync(),
    });

  const i = integrity.data;
  const intact = !!i && i.brokenLinks.length === 0 && i.balanceDrift === 0;
  const l = limits.data;
  const cur = currencyLabel(l?.currency ?? "XAF");

  if (!allowed) {
    return <p className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-600">L'intégrité et les plafonds sont réservés aux administrateurs.</p>;
  }

  return (
    <div className="space-y-5">
      <Section title="Intégrité du ledger" description="Chaînage des écritures et cohérence du solde" icon={ShieldCheck} action={i && <StatusChip tone={intact ? "success" : "danger"}>{intact ? "Intact" : "Anomalie"}</StatusChip>}>
        {integrity.isLoading ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : integrity.isError || !i ? (
          <ErrorBlock message="Impossible de vérifier l'intégrité." onRetry={() => integrity.refetch()} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat label="Écritures contrôlées" value={i.entriesChecked.toLocaleString("fr-FR")} />
            <Stat label="Liens rompus" value={i.brokenLinks.length} />
            <Stat label="Non chaînées" value={i.unchained} />
            <Stat label="Solde attendu" value={formatMoney(i.expectedBalance, cur)} />
            <Stat label="Écart de solde" value={formatMoney(i.balanceDrift, cur)} />
          </div>
        )}
      </Section>

      <Section title="Plafonds appliqués" description={l ? `${l.policyName} · niveau KYC ${l.kycLevel}` : "Politique de limites du portefeuille"}>
        {limits.isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : limits.isError || !l ? (
          <ErrorBlock message="Impossible de charger les plafonds." onRetry={() => limits.refetch()} />
        ) : (
          <div className="space-y-4">
            {[
              { label: "Transferts du jour", used: l.dailyTransferUsed, max: l.maxDailyTransfer },
              { label: "Transferts du mois", used: l.monthlyTransferUsed, max: l.maxMonthlyTransfer },
              { label: "Recharges du jour", used: l.dailyTopUpUsed, max: l.maxDailyTopUp },
            ].map((r) => (
              <div key={r.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold text-gray-700">{r.label}</span>
                  <span className="tabular-nums text-gray-500">
                    {formatMoney(r.used, cur)} sur {formatMoney(r.max, cur)}
                  </span>
                </div>
                <RatioBar value={r.used} total={Math.max(r.max, 1)} />
              </div>
            ))}
            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-gray-700">Opérations du jour</span>
                <span className="tabular-nums text-gray-500">
                  {String(l.dailyOperationsUsed)} sur {l.maxDailyOperations}
                </span>
              </div>
              <RatioBar value={Number(l.dailyOperationsUsed)} total={Math.max(l.maxDailyOperations, 1)} />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <Stat label="Plafond par transfert" value={formatMoney(l.maxSingleTransfer, cur)} />
              <Stat label="Solde maximum" value={formatMoney(l.maxBalance, cur)} />
            </div>
            {l.upgradePath && <p className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">{l.upgradePath}</p>}
          </div>
        )}
      </Section>

      <Section title="Code secret" description="Le titulaire devra le redéfinir après la réinitialisation" icon={KeyRound}>
        <ActionButton variant="ghost" icon={KeyRound} onClick={askReset}>
          Demander la réinitialisation
        </ActionButton>
      </Section>
    </div>
  );
};
