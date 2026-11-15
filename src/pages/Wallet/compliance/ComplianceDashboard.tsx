import React from "react";
import { useQuery } from "@tanstack/react-query";
import { walletControlService } from "../../../services/walletControl.service";
import { ErrorBlock, ListHeader, Section } from "../../../components/subscription/kit";
import { ChartCard, ColumnChart, DonutBreakdown, KpiRow, KpiRowSkeleton, NoData } from "../../../components/operations/OpsCharts";
import { CHART_COLORS } from "../../../components/operations/opsChartData";
import type { Slice } from "../../../components/operations/opsChartData";
import { Skeleton } from "../../../components/ui/Skeleton";
import { PRIORITY } from "../../../components/wallet/walletLabels";
import { OpenFields } from "../../../components/wallet/control/OpenFields";
import { extraEntries } from "../../../components/wallet/control/controlUtils";

const toSlices = (rec: Record<string, number> | undefined, label: (k: string) => string): Slice[] =>
  Object.entries(rec ?? {}).map(([k, value], i) => ({ key: k, label: label(k), value, color: CHART_COLORS[i % CHART_COLORS.length] }));

/** Tableau de bord de la conformité : dossiers, correspondances de listes, gels et règles. */
export const ComplianceDashboard: React.FC = () => {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["wallet-compliance-dashboard"], queryFn: () => walletControlService.getComplianceDashboard() });

  return (
    <div className="space-y-5">
      <ListHeader title="Tableau de bord" subtitle="Dossiers ouverts, correspondances à revoir et gels actifs" />
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
              { label: "Dossiers ouverts", value: data.openCases },
              { label: "Dossiers en retard", value: data.overdueCases, tone: data.overdueCases > 0 ? "danger" : "default" },
              { label: "Correspondances à revoir", value: data.unreviewedListMatches, tone: data.unreviewedListMatches > 0 ? "pink" : "default" },
              { label: "Gels actifs", value: data.activeFreezes },
            ]}
          />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ChartCard title="Dossiers ouverts par priorité">
              <DonutBreakdown data={toSlices(data.openByPriority, (k) => PRIORITY[k]?.label ?? k)} centerLabel="dossiers" />
            </ChartCard>
            <ChartCard title="Dossiers ouverts par ancienneté">
              {Object.keys(data.openByAge ?? {}).length === 0 ? <NoData text="Aucun dossier ouvert." /> : <ColumnChart data={toSlices(data.openByAge, (k) => k)} />}
            </ChartCard>
          </div>
          {data.rules.length > 0 && (
            <Section title="Activité des règles" description="Statistiques renvoyées par règle">
              <div className="space-y-2">
                {data.rules.map((r) => (
                  <div key={r.ruleCode} className="rounded-2xl bg-gray-50 p-3">
                    <p className="font-mono text-sm font-bold text-gray-950">{r.ruleCode}</p>
                    <OpenFields entries={extraEntries(r, ["ruleCode"])} className="mt-1" />
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
};
