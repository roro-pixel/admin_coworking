import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { documentService } from "../../services/document.service";
import { ActionButton, ErrorBlock, Field, ListHeader } from "../../components/subscription/kit";
import { FIELD, apiMessage } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { ChartCard, ChartSkeleton, KpiRow, KpiRowSkeleton, NoData } from "../../components/operations/OpsCharts";
import { RankBars, ValueDonut } from "../../components/reporting/ReportCharts";
import { RefreshButton } from "../../components/reporting/reportKit";
import { saveBlob } from "../../components/payment/paymentUtils";
import { CATEGORY_LABEL, DOC_STATUS_LABEL, SPACES, SPACE_LABEL, STATUS_COLOR, fmtHours, fmtInt, toRank } from "../../components/documents/docUtils";

export const DocumentAnalyticsExportPage: React.FC = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [space, setSpace] = useState("");
  const params = { from: from || undefined, to: to || undefined, space: space || undefined };

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["document-analytics", params],
    queryFn: () => documentService.getDocumentAnalytics(params),
  });

  const exportCsv = useMutation({
    mutationFn: async () => saveBlob(await documentService.exportDocumentsCsv(params), "documents_export.csv"),
    onError: (e) => toast.error(apiMessage(e, "Export impossible")),
  });

  const header = (
    <>
      <ListHeader
        title="Analytics et export"
        subtitle="Activité documentaire sur la période, export CSV de la sélection"
        action={
          <div className="flex items-center gap-2">
            <RefreshButton fetching={isFetching} onClick={() => refetch()} />
            <ActionButton icon={Download} pending={exportCsv.isPending} onClick={() => exportCsv.mutate()}>
              Export CSV
            </ActionButton>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Du">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Au">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Espace">
          <select value={space} onChange={(e) => setSpace(e.target.value)} className={FIELD}>
            <option value="">Tous les espaces</option>
            {SPACES.map((s) => (
              <option key={s} value={s}>
                {SPACE_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <KpiRowSkeleton count={5} columns={5} />
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
        <ErrorBlock message="Les statistiques n'ont pas pu être chargées." onRetry={() => refetch()} />
      </div>
    );
  }

  const uploaded = data.totalUploaded ?? 0;
  const reviewed = data.totalReviewed ?? 0;
  const approved = data.totalApproved ?? 0;
  const rejected = data.totalRejected ?? 0;
  const byStatus = toRank(data.byStatus, DOC_STATUS_LABEL, STATUS_COLOR);
  const bySpace = toRank(data.bySpace, SPACE_LABEL);
  const byCategory = toRank(data.byCategory, CATEGORY_LABEL);

  return (
    <div className="space-y-6">
      {header}
      <KpiRow
        columns={5}
        items={[
          { label: "Envoyés", value: fmtInt(uploaded) },
          { label: "Revus", value: fmtInt(reviewed), tone: "pink" },
          { label: "Approuvés", value: fmtInt(approved), tone: "success" },
          { label: "Rejetés", value: fmtInt(rejected), tone: rejected > 0 ? "danger" : "default" },
          { label: "Délai moyen de revue", value: fmtHours(data.avgReviewHours ?? 0) },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Parcours des documents" subtitle="De l'envoi à la décision">
          <RankBars
            format={fmtInt}
            items={[
              { key: "up", label: "Envoyés", value: uploaded, color: "#5B8DEF" },
              { key: "rev", label: "Revus", value: reviewed, color: "#E0529C" },
              { key: "ok", label: "Approuvés", value: approved, color: "#2E9E6B" },
              { key: "ko", label: "Rejetés", value: rejected, color: "#D6455D" },
            ]}
          />
        </ChartCard>
        <ChartCard title="Par statut" subtitle="Répartition sur la période">
          {byStatus.length === 0 ? <NoData /> : <ValueDonut data={byStatus} centerLabel="documents" format={fmtInt} />}
        </ChartCard>
        <ChartCard title="Par espace">{bySpace.length === 0 ? <NoData /> : <RankBars items={bySpace} format={fmtInt} />}</ChartCard>
        <ChartCard title="Par catégorie">{byCategory.length === 0 ? <NoData /> : <RankBars items={byCategory} format={fmtInt} />}</ChartCard>
      </div>
    </div>
  );
};
