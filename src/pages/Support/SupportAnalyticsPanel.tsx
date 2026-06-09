import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download, Loader2 } from "lucide-react";
import { operationsService } from "../../services/operations.service";

const today = new Date().toISOString().slice(0, 10);
const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const fmt = (v?: number) => Number(v ?? 0).toLocaleString("fr-FR");
const pct = (v?: number) => `${Number(v ?? 0).toFixed(1)} %`;

export const SupportAnalyticsPanel: React.FC = () => {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today);

  const queryParams = {
    from: from ? `${from}T00:00:00Z` : undefined,
    to: to ? `${to}T23:59:59Z` : undefined,
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["support-ticket-analytics", from, to],
    queryFn: () => operationsService.getTicketAnalytics(queryParams),
  });

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["support-agent-performance", from, to],
    queryFn: () => operationsService.getSupportAgentPerformance(queryParams),
  });

  const downloadCsv = async () => {
    const blob =
      await operationsService.downloadTicketAnalyticsCsv(queryParams);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `support_analytics_${from}_${to}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Analytics tickets
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Analyse des volumes, SLA et performances des agents support.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Du</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Au</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-2"
          >
            <BarChart3 size={16} /> Actualiser
          </button>
          <button
            onClick={downloadCsv}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm flex items-center gap-2"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl p-10 text-center">
          <Loader2 className="animate-spin mx-auto text-primary-600" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card label="Créés" value={fmt(data.totalCreated)} />
            <Card label="Résolus" value={fmt(data.totalResolved)} />
            <Card
              label="Ouverts fin période"
              value={fmt(data.openAtEndOfPeriod)}
            />
            <Card
              label="Taux breach SLA"
              value={pct(data.slaBreachRate)}
              danger={(data.slaBreachRate ?? 0) > 0}
            />
            <Card
              label="1ère réponse moyenne"
              value={`${fmt(data.avgFirstResponseHours)} h`}
            />
            <Card
              label="Résolution moyenne"
              value={`${fmt(data.avgResolutionHours)} h`}
            />
            <Card label="Réouverts" value={fmt(data.reopenedCount)} />
            <Card
              label="En attente client"
              value={fmt(data.waitingClientCount)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Breakdown title="Par catégorie" data={data.byCategory} />
            <Breakdown title="Par priorité" data={data.byPriority} />
          </div>
        </>
      ) : null}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold">Performance agents</h3>
        </div>
        {agentsLoading ? (
          <div className="p-6 text-center text-sm text-gray-500">
            Chargement...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-right">Assignés</th>
                <th className="px-4 py-3 text-right">Résolus</th>
                <th className="px-4 py-3 text-right">1ère réponse</th>
                <th className="px-4 py-3 text-right">Résolution</th>
                <th className="px-4 py-3 text-right">Breach SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {agents.map((a: any, i: number) => (
                <tr key={a.agentId || i}>
                  <td className="px-4 py-3 font-medium">
                    {a.agentName || a.agentId || "Agent"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {fmt(a.assignedTickets)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {fmt(a.resolvedTickets)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {fmt(a.avgFirstResponseHours)} h
                  </td>
                  <td className="px-4 py-3 text-right">
                    {fmt(a.avgResolutionHours)} h
                  </td>
                  <td className="px-4 py-3 text-right">
                    {fmt(a.slaBreachCount)}
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Aucune donnée agent.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const Card = ({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) => (
  <div className="bg-white rounded-xl shadow-sm p-4">
    <p
      className={`text-2xl font-bold ${danger ? "text-red-600" : "text-gray-900"}`}
    >
      {value}
    </p>
    <p className="text-xs text-gray-500 mt-1">{label}</p>
  </div>
);

const Breakdown = ({
  title,
  data,
}: {
  title: string;
  data?: Record<string, number>;
}) => {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {entries.map(([k, v]) => (
          <div key={k}>
            <div className="flex justify-between text-sm mb-1">
              <span>{k}</span>
              <span>{v}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600"
                style={{ width: `${(v / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-gray-500">Aucune donnée.</p>
        )}
      </div>
    </div>
  );
};
