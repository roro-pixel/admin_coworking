import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportingService } from "../../services/reporting.service";
import type { RealOwnerActivity } from "../../services/reporting.service";
import { ChartCard, KpiRow } from "../../components/operations/OpsCharts";
import { RankBars, ValueDonut } from "../../components/reporting/ReportCharts";
import { PeriodBar, RefreshButton, ReportBody, ReportHead, ReportTable, SelectField, Sub } from "../../components/reporting/reportKit";
import { fmtInt, money, monthRange } from "../../components/reporting/reportUtils";
import { CHART_COLORS } from "../../components/operations/opsChartData";
import { StatusChip } from "../../components/subscription/kit";
import { PINK_SOFT, formatDate } from "../../components/subscription/kitUtils";
import type { Tone } from "../../components/subscription/kitUtils";

const LIMITS = [
  { value: 5, label: "Top 5" },
  { value: 10, label: "Top 10" },
  { value: 20, label: "Top 20" },
];

const TYPE_LABEL: Record<string, string> = { BUSINESS: "Entreprise", MEMBER: "Membre" };
const typeTone = (t: string): Tone => (t === "BUSINESS" ? "info" : t === "MEMBER" ? "pink" : "neutral");

export const TopOwnersReport: React.FC = () => {
  const [range, setRange] = useState(monthRange());
  const [limit, setLimit] = useState(10);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["top-owners", range.from, range.to, limit],
    queryFn: async () => {
      const response = await reportingService.getTopOwners({ fromDate: range.from, toDate: range.to, limit });
      return response as unknown as RealOwnerActivity[];
    },
  });

  const owners = Array.isArray(data) ? data : [];
  const totalRevenue = owners.reduce((a, o) => a + (o.revenue || 0), 0);
  const totalBookings = owners.reduce((a, o) => a + (o.bookingCount || 0), 0);

  return (
    <div className="space-y-6">
      <ReportHead title="Top clients" subtitle="Les clients qui réservent et dépensent le plus">
        <PeriodBar value={range} onChange={setRange} />
        <SelectField label="Nombre de clients" value={limit} options={LIMITS} onChange={setLimit} />
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <ReportBody loading={isLoading} error={isError} hasData={owners.length > 0} onRetry={() => refetch()} kpis={3}>
        <KpiRow
          columns={3}
          items={[
            { label: "Dépenses cumulées", value: money(totalRevenue), tone: "pink" },
            { label: "Réservations", value: fmtInt(totalBookings) },
            { label: "Meilleur client", value: owners[0]?.ownerName ?? "", hint: owners[0] ? money(owners[0].revenue) : undefined },
          ]}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Dépenses par client" subtitle="Les 8 premiers du classement">
            <RankBars
              format={money}
              items={owners.slice(0, 8).map((o) => ({ key: o.ownerCode, label: o.ownerName || "Sans nom", value: o.revenue || 0 }))}
            />
          </ChartCard>
          <ChartCard title="Répartition des dépenses" subtitle="Les 5 premiers du classement">
            <ValueDonut
              centerLabel="dépensés"
              format={money}
              data={owners.slice(0, 5).map((o, i) => ({
                key: o.ownerCode,
                label: o.ownerName || "Sans nom",
                value: o.revenue || 0,
                color: CHART_COLORS[i % CHART_COLORS.length],
              }))}
            />
          </ChartCard>
        </div>
        <ChartCard title="Classement détaillé">
          <ReportTable
            cols={[
              { key: "rank", label: "#", width: "2.5rem" },
              { key: "name", label: "Client", width: "minmax(0,1.6fr)" },
              { key: "type", label: "Type" },
              { key: "bookings", label: "Réservations", align: "right" },
              { key: "revenue", label: "Dépenses", align: "right" },
              { key: "last", label: "Dernière réservation", align: "right" },
            ]}
            rows={owners.map((o, i) => ({
              id: o.ownerCode,
              cells: {
                rank: (
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}>
                    {i + 1}
                  </span>
                ),
                name: (
                  <>
                    <span className="block truncate font-semibold text-gray-950">{o.ownerName || "Sans nom"}</span>
                    <Sub>{o.ownerCode}</Sub>
                  </>
                ),
                type: <StatusChip tone={typeTone(o.ownerType)}>{TYPE_LABEL[o.ownerType] ?? "Client"}</StatusChip>,
                bookings: fmtInt(o.bookingCount),
                revenue: <b className="text-gray-950">{money(o.revenue)}</b>,
                last: formatDate(o.lastBookingAt) || "Aucune",
              },
            }))}
          />
        </ChartCard>
      </ReportBody>
    </div>
  );
};
