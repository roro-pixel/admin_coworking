import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileSpreadsheet, FileText, Search } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import { ActionButton, ErrorBlock, Field } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate, formatDateTime, formatMoney } from "../../../components/subscription/kitUtils";
import { toast } from "../../../components/ui/toastStore";
import { saveBlob } from "../../../components/payment/paymentUtils";
import { ReportHead, ReportTable, Sub } from "../../../components/reporting/reportKit";
import { ChartCard, KpiRow, NoData } from "../../../components/operations/OpsCharts";
import { Skeleton } from "../../../components/ui/Skeleton";
import { MOVEMENT_LABEL, label, qty } from "../../../components/inventory/invKit";
import { usePaged } from "../../../components/inventory/invKit";
import { Pagination } from "../../../components/subscription/kit";

export const ReportsPage: React.FC = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [busy, setBusy] = useState<"csv" | "pdf" | null>(null);

  const movements = useQuery({
    queryKey: ["movements-report", fromDate, toDate, itemFilter, ""],
    // /inventory/admin/reports/movements documente fromDate/toDate (contrairement à /stock/movements qui prend from/to)
    queryFn: () => inventoryService.getMovementsReport({ fromDate: fromDate || undefined, toDate: toDate || undefined, itemCode: itemFilter.trim() || undefined }),
    enabled: false,
  });
  const anomalies = useQuery({ queryKey: ["anomalies-report"], queryFn: () => inventoryService.getAnomaliesReport() });

  const rows: any[] = movements.data?.data ?? [];
  const pg = usePaged(rows, 15);
  const a = anomalies.data;
  const counts = { neg: a?.negativeStockItems?.length || 0, exp: a?.expiredLots?.length || 0, orphan: a?.orphanAssets?.length || 0 };

  const exportFile = async (kind: "csv" | "pdf") => {
    setBusy(kind);
    try {
      const params = { fromDate: fromDate || undefined, toDate: toDate || undefined };
      const blob = kind === "csv" ? await inventoryService.exportMovementsCSV(params) : await inventoryService.exportMovementsPDF(params);
      saveBlob(blob, `mouvements_${fromDate}_${toDate}.${kind}`);
    } catch (e) {
      toast.error(apiMessage(e, "Export impossible"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      <ReportHead title="Rapports" subtitle="Mouvements de stock sur une période et anomalies détectées." />

      <section className="space-y-5">
        <Sub>Mouvements de stock</Sub>
        <div className="grid gap-4 rounded-3xl bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Du"><input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} className={FIELD} /></Field>
          <Field label="Au"><input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className={FIELD} /></Field>
          <Field label="Article" hint="Code article, facultatif"><input value={itemFilter} onChange={(e) => setItemFilter(e.target.value)} placeholder="Tous les articles" className={FIELD} /></Field>
          <div className="flex flex-wrap items-end gap-2">
            <ActionButton icon={Search} pending={movements.isFetching} onClick={() => movements.refetch()}>Générer</ActionButton>
            <ActionButton variant="ghost" icon={FileSpreadsheet} pending={busy === "csv"} disabled={!fromDate || !toDate} onClick={() => exportFile("csv")}>CSV</ActionButton>
            <ActionButton variant="ghost" icon={FileText} pending={busy === "pdf"} disabled={!fromDate || !toDate} onClick={() => exportFile("pdf")}>PDF</ActionButton>
          </div>
        </div>
        {(!fromDate || !toDate) && <p className="text-xs text-gray-400">Choisissez les deux dates pour activer les exports.</p>}

        {movements.isError ? (
          <ErrorBlock message="Impossible de générer le rapport." onRetry={() => movements.refetch()} />
        ) : movements.isFetching ? (
          <Skeleton className="h-64 w-full rounded-3xl" />
        ) : movements.data ? (
          <>
            <ReportTable
              empty="Aucun mouvement pour ces critères."
              cols={[
                { key: "date", label: "Date", width: "7rem" },
                { key: "type", label: "Type", width: "9rem" },
                { key: "item", label: "Article" },
                { key: "qty", label: "Quantité", width: "7rem", align: "right" },
                { key: "cost", label: "Coût", width: "9rem", align: "right" },
                { key: "ref", label: "Référence", width: "9rem" },
              ]}
              rows={pg.slice.map((m, i) => ({
                id: String(pg.page * 15 + i),
                cells: {
                  date: m.performedAt ? formatDate(m.performedAt) : "Non renseignée",
                  type: label(MOVEMENT_LABEL, m.movementType),
                  item: m.itemName,
                  qty: qty(m.quantity),
                  cost: m.totalCost !== undefined && m.totalCost !== null ? formatMoney(m.totalCost, "FCFA") : "Non renseigné",
                  ref: m.referenceCode || "Aucune",
                },
              }))}
            />
            <Pagination page={pg.page} totalPages={pg.totalPages} total={pg.total} noun="mouvement" onChange={pg.setPage} />
          </>
        ) : (
          <p className="rounded-3xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">Choisissez une période puis lancez la génération pour afficher les mouvements.</p>
        )}
      </section>

      <section className="space-y-5">
        <Sub>Anomalies détectées</Sub>
        {anomalies.isLoading ? (
          <Skeleton className="h-32 w-full rounded-3xl" />
        ) : anomalies.isError ? (
          <ErrorBlock message="Impossible de charger les anomalies." onRetry={() => anomalies.refetch()} />
        ) : (
          <>
            <KpiRow
              columns={3}
              items={[
                { label: "Articles en stock négatif", value: qty(counts.neg), tone: counts.neg ? "danger" : "success" },
                { label: "Lots expirés", value: qty(counts.exp), tone: counts.exp ? "danger" : "success" },
                { label: "Actifs orphelins", value: qty(counts.orphan), tone: counts.orphan ? "danger" : "success" },
              ]}
            />
            <ChartCard title="Contrôle d'intégrité" subtitle={a?.generatedAt ? `Généré le ${formatDateTime(a.generatedAt)}` : undefined}>
              {counts.neg + counts.exp + counts.orphan === 0 ? <NoData text="Aucune anomalie détectée." /> : (
                <p className="flex items-start gap-2 text-sm text-gray-600"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />Des écarts demandent une vérification : consultez les articles concernés dans les niveaux de stock, les lots et les actifs.</p>
              )}
            </ChartCard>
          </>
        )}
      </section>
    </div>
  );
};
