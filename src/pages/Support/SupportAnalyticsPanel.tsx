import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download } from "lucide-react";
import { operationsService } from "../../services/operations.service";
import { ActionButton, EmptyState, Field, ListHeader } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { Skeleton } from "../../components/ui/Skeleton";
import { Avatar } from "../../components/operations/opsKit";
import {
  BarBreakdown,
  ChartCard,
  ChartSkeleton,
  DonutBreakdown,
  KpiRow,
  KpiRowSkeleton,
  NoData,
  RatioBar,
} from "../../components/operations/OpsCharts";
import { PRIORITY_STYLE, TICKET_CATEGORY, styleLabels } from "../../components/operations/opsLabels";
import { toSlices } from "../../components/operations/opsChartData";

const today = new Date().toISOString().slice(0, 10);
const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const fmt = (v?: number) => Number(v ?? 0).toLocaleString("fr-FR");
const pct = (v?: number) => `${Number(v ?? 0).toFixed(1)} %`;

const PRIORITY_LABELS = styleLabels(PRIORITY_STYLE);
const PRIORITY_ORDER = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;
const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "#D64545",
  HIGH: "#E8A33D",
  MEDIUM: "#9B8FD1",
  LOW: "#B9B4B0",
};

export const SupportAnalyticsPanel: React.FC = () => {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today);
  const [exporting, setExporting] = useState(false);

  const queryParams = {
    from: from ? `${from}T00:00:00Z` : undefined,
    to: to ? `${to}T23:59:59Z` : undefined,
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["support-ticket-analytics", from, to],
    queryFn: () => operationsService.getTicketAnalytics(queryParams),
  });

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["support-agent-performance", from, to],
    queryFn: () => operationsService.getSupportAgentPerformance(queryParams),
  });

  const downloadCsv = async () => {
    setExporting(true);
    try {
      const blob =
        await operationsService.downloadTicketAnalyticsCsv(queryParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `support_analytics_${from}_${to}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(apiMessage(e, "Export CSV impossible"));
    } finally {
      setExporting(false);
    }
  };

  const categories = toSlices(data?.byCategory, TICKET_CATEGORY);
  const priorities = toSlices(data?.byPriority, PRIORITY_LABELS, PRIORITY_ORDER, PRIORITY_COLORS);

  return (
    <div className="space-y-5">
      <ListHeader
        title="Analytics tickets"
        subtitle="Volumes, SLA et performance des agents support"
        action={
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Du">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD_SOFT} />
            </Field>
            <Field label="Au">
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={FIELD_SOFT} />
            </Field>
            <ActionButton icon={BarChart3} pending={isFetching && !isLoading} onClick={() => refetch()}>
              Actualiser
            </ActionButton>
            <ActionButton variant="ghost" icon={Download} pending={exporting} onClick={downloadCsv}>
              Export CSV
            </ActionButton>
          </div>
        }
      />

      {isLoading ? (
        <>
          <KpiRowSkeleton count={8} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </>
      ) : data ? (
        <>
          <KpiRow
            items={[
              { label: "Créés", value: fmt(data.totalCreated) },
              { label: "Résolus", value: fmt(data.totalResolved), tone: "success" },
              { label: "Ouverts en fin de période", value: fmt(data.openAtEndOfPeriod) },
              {
                label: "Taux de dépassement SLA",
                value: pct(data.slaBreachRate),
                tone: (data.slaBreachRate ?? 0) > 0 ? "danger" : "default",
              },
              { label: "1ère réponse moyenne", value: `${fmt(data.avgFirstResponseHours)} h` },
              { label: "Résolution moyenne", value: `${fmt(data.avgResolutionHours)} h` },
              { label: "Réouverts", value: fmt(data.reopenedCount) },
              { label: "En attente client", value: fmt(data.waitingClientCount) },
            ]}
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard title="Tickets par catégorie" subtitle="Créés sur la période">
              <BarBreakdown data={categories} />
            </ChartCard>
            <ChartCard title="Répartition par priorité">
              <DonutBreakdown data={priorities} centerLabel="tickets" />
            </ChartCard>
          </div>
        </>
      ) : (
        <EmptyState icon={BarChart3} title="Aucune statistique" hint="Choisissez une autre période." />
      )}

      <ChartCard
        title="Performance des agents"
        subtitle="Tickets résolus sur tickets assignés, délais moyens et dépassements SLA"
      >
        {agentsLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <NoData text="Aucune donnée agent." />
        ) : (
          <ul className="space-y-2">
            {agents.map((a: any, i: number) => {
              const name = a.agentName || a.agentId || "Agent";
              return (
                <li
                  key={a.agentId || i}
                  className="grid grid-cols-1 items-center gap-3 rounded-2xl bg-gray-50 p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_repeat(3,minmax(0,0.8fr))] lg:gap-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={name} />
                    <span className="truncate font-semibold text-gray-950">{name}</span>
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs text-gray-500">
                      <span>Résolus</span>
                      <span className="tabular-nums">
                        <b className="text-gray-950">{fmt(a.resolvedTickets)}</b> / {fmt(a.assignedTickets)}
                      </span>
                    </div>
                    <RatioBar value={a.resolvedTickets ?? 0} total={a.assignedTickets ?? 0} />
                  </div>
                  <Stat label="1ère réponse" value={`${fmt(a.avgFirstResponseHours)} h`} />
                  <Stat label="Résolution" value={`${fmt(a.avgResolutionHours)} h`} />
                  <Stat label="Dépassements SLA" value={fmt(a.slaBreachCount)} danger={(a.slaBreachCount ?? 0) > 0} />
                </li>
              );
            })}
          </ul>
        )}
      </ChartCard>

    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; danger?: boolean }> = ({ label, value, danger }) => (
  <div className="flex items-baseline justify-between gap-2 lg:block">
    <p className="text-xs text-gray-400">{label}</p>
    <p className={`font-bold tabular-nums ${danger ? "text-red-600" : "text-gray-950"}`}>{value}</p>
  </div>
);
