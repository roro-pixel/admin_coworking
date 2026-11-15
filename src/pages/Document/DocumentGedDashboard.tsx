import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentService } from "../../services/document.service";
import { ErrorBlock, Field, ListHeader } from "../../components/subscription/kit";
import { FIELD } from "../../components/subscription/kitUtils";
import { ChartCard, ChartSkeleton, KpiRow, KpiRowSkeleton, NoData } from "../../components/operations/OpsCharts";
import { RankBars, ValueDonut } from "../../components/reporting/ReportCharts";
import { RefreshButton } from "../../components/reporting/reportKit";
import { DOC_STATUS_LABEL, SPACES, SPACE_LABEL, STATUS_COLOR, fmtInt, toRank } from "../../components/documents/docUtils";

export const DocumentGedDashboard: React.FC = () => {
  const [space, setSpace] = useState("");
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["document-dashboard", space],
    queryFn: () => documentService.getDocumentDashboard(space || undefined),
  });

  const header = (
    <ListHeader
      title="Tableau de bord documentaire"
      subtitle="Les documents par statut et par espace"
      action={
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Espace">
            <select value={space} onChange={(e) => setSpace(e.target.value)} className={`${FIELD} min-w-[12rem]`}>
              <option value="">Tous les espaces</option>
              {SPACES.map((s) => (
                <option key={s} value={s}>
                  {SPACE_LABEL[s] ?? s}
                </option>
              ))}
            </select>
          </Field>
          <RefreshButton fetching={isFetching} onClick={() => refetch()} />
        </div>
      }
    />
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <KpiRowSkeleton count={4} columns={4} />
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorBlock message="Les indicateurs documentaires n'ont pas pu être chargés." onRetry={() => refetch()} />
      </div>
    );
  }

  const byStatus = toRank(data.byStatus, DOC_STATUS_LABEL, STATUS_COLOR);
  const bySpace = toRank(data.bySpace, SPACE_LABEL);

  return (
    <div className="space-y-6">
      {header}
      <KpiRow
        items={[
          { label: "Documents", value: fmtInt(data.totalDocuments ?? 0) },
          { label: "En revue", value: fmtInt(data.pendingReview ?? 0), tone: "pink" },
          { label: "Expirés", value: fmtInt(data.expiredDocuments ?? 0), tone: (data.expiredDocuments ?? 0) > 0 ? "danger" : "default" },
          { label: "À corriger", value: fmtInt(data.needsCorrection ?? 0) },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Répartition par statut" subtitle="Tous les documents de la sélection">
          {byStatus.length === 0 ? <NoData /> : <ValueDonut data={byStatus} centerLabel="documents" format={fmtInt} />}
        </ChartCard>
        <ChartCard title="Documents par espace" subtitle="Volume par espace documentaire">
          {bySpace.length === 0 ? <NoData /> : <RankBars items={bySpace} format={fmtInt} />}
        </ChartCard>
      </div>
    </div>
  );
};
