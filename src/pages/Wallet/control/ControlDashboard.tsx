import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { walletControlService } from "../../../services/walletControl.service";
import { ActionButton, ErrorBlock, Field, ListHeader, Section } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatMoney } from "../../../components/subscription/kitUtils";
import { ChartCard, DonutBreakdown, KpiRow, KpiRowSkeleton, NoData } from "../../../components/operations/OpsCharts";
import { CHART_COLORS } from "../../../components/operations/opsChartData";
import type { Slice } from "../../../components/operations/opsChartData";
import { Skeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { currencyLabel } from "../../../components/payment/paymentUtils";
import { ENTRY_TYPE_LABEL, WALLET_STATUS_LABEL_OPEN } from "../../../components/wallet/walletLabels";
import { OpenFields } from "../../../components/wallet/control/OpenFields";
import { extraEntries, saveBlob } from "../../../components/wallet/control/controlUtils";

/** Tableau de bord du centre de contrôle : soldes, statuts, volume du jour et export des mouvements. */
export const ControlDashboard: React.FC = () => {
  const [currency, setCurrency] = useState("XAF");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["wallet-control-dashboard", currency],
    queryFn: () => walletControlService.getDashboard(currency),
    enabled: currency.length === 3,
  });

  const exportMutation = useMutation({
    mutationFn: () => walletControlService.exportMovements({ from: from || undefined, to: to || undefined }),
    onSuccess: (blob) => saveBlob(blob, `mouvements${from ? `-${from}` : ""}${to ? `-${to}` : ""}.csv`),
    onError: (e) => toast.error(apiMessage(e, "Export impossible.")),
  });

  const cur = currencyLabel(data?.currency ?? currency);
  const statusSlices: Slice[] = Object.entries(data?.walletsByStatus ?? {}).map(([k, value], i) => ({
    key: k,
    label: WALLET_STATUS_LABEL_OPEN(k),
    value,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="space-y-5">
      <ListHeader
        title="Tableau de bord"
        subtitle="Situation des portefeuilles et points d'attention"
        action={
          <div className="w-28">
            <Field label="Devise">
              <input className={`${FIELD} font-mono`} value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
            </Field>
          </div>
        }
      />

      {isLoading ? (
        <>
          <KpiRowSkeleton count={4} columns={4} />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </>
      ) : isError || !data ? (
        <ErrorBlock message="Impossible de charger le tableau de bord." onRetry={() => refetch()} />
      ) : (
        <>
          <KpiRow
            columns={4}
            items={[
              { label: "Solde total", value: formatMoney(data.totalWalletBalance, cur), tone: "success" },
              { label: "Total bloqué", value: formatMoney(data.totalHeldBalance, cur), tone: "pink" },
              { label: "Portefeuilles ouverts", value: data.openWallets.toLocaleString("fr-FR") },
              { label: "Soldes négatifs", value: data.negativeBalances.toLocaleString("fr-FR"), tone: data.negativeBalances > 0 ? "danger" : "default" },
            ]}
          />
          <KpiRow
            columns={5}
            items={[
              { label: "Alertes ouvertes", value: data.openFlags, tone: data.openFlags > 0 ? "danger" : "default" },
              { label: "Visas en attente", value: data.pendingApprovals, tone: data.pendingApprovals > 0 ? "pink" : "default" },
              { label: "Gelés", value: data.frozenWallets },
              { label: "Verrouillés par le titulaire", value: data.lockedByOwner },
              { label: "Dormants", value: data.dormantWallets },
            ]}
          />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <ChartCard title="Statuts" subtitle="Tous les portefeuilles">
              <DonutBreakdown data={statusSlices} centerLabel="portefeuilles" />
            </ChartCard>
            <div className="xl:col-span-2">
              <ChartCard title="Volume du jour" subtitle="Mouvements par type">
                {data.todayVolume.length === 0 ? (
                  <NoData text="Aucun mouvement aujourd'hui." />
                ) : (
                  <ul className="space-y-2">
                    {data.todayVolume.map((v, i) => (
                      <li key={`${v.entryType}-${v.direction}-${i}`} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{ENTRY_TYPE_LABEL[v.entryType] ?? v.entryType}</p>
                          <p className="text-xs text-gray-400">
                            {v.direction === "CREDIT" ? "Crédit" : "Débit"} · {v.count} mouvement{v.count > 1 ? "s" : ""}
                          </p>
                        </div>
                        <p className={`text-sm font-bold tabular-nums ${v.direction === "CREDIT" ? "text-emerald-700" : "text-red-600"}`}>{formatMoney(v.amount, cur)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </ChartCard>
            </div>
          </div>

          {data.latestReconciliation && (
            <Section title="Dernier rapprochement de trésorerie" description="Dernier état enregistré">
              <OpenFields entries={extraEntries(data.latestReconciliation, [])} className="!grid-cols-1 sm:!grid-cols-2" />
            </Section>
          )}
        </>
      )}

      <Section title="Export des mouvements" description="Fichier CSV de tous les mouvements sur la période">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Du">
            <input type="date" className={FIELD} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Au">
            <input type="date" className={FIELD} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <ActionButton icon={Download} pending={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
            Exporter
          </ActionButton>
        </div>
      </Section>
    </div>
  );
};
