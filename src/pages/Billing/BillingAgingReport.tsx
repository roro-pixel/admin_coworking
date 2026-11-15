import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { billingService } from "../../services/billing.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, HeadRow, ListHeader, StatusChip } from "../../components/subscription/kit";
import { FIELD_SOFT, ROW_HOVER, formatDate, formatMoney } from "../../components/subscription/kitUtils";
import { ListSkeleton, Skeleton } from "../../components/ui/Skeleton";
import { useNavigate } from "react-router-dom";
import { ChartCard, ColumnChart, DonutBreakdown, KpiRow, KpiRowSkeleton } from "../../components/operations/OpsCharts";
import { CHART_COLORS } from "../../components/operations/opsChartData";
import type { Slice } from "../../components/operations/opsChartData";
import { AGING_BUCKETS, BUCKET_LABEL, CUSTOMER_TYPE_LABEL } from "../../components/billing/billingLabels";
import { currencyLabel } from "../../components/payment/paymentUtils";

const COLS = "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_8rem_10rem_9rem]";
// Du plus sain au plus critique : rose de marque pour le non échu, puis teintes de la palette qui chauffent
const BUCKET_COLORS = [CHART_COLORS[2], CHART_COLORS[1], CHART_COLORS[0], "#B8325A", "#7A1F3D"];

export const BillingAgingReport: React.FC = () => {
  const navigate = useNavigate();
  const [customerType, setCustomerType] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [debouncedCode, setDebouncedCode] = useState("");
  const [currency, setCurrency] = useState("XAF");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCode(customerCode), 400);
    return () => clearTimeout(t);
  }, [customerCode]);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["billing-aging-report", customerType, debouncedCode, currency],
    queryFn: () =>
      billingService.getAgingReport({
        customerType: customerType || undefined,
        customerCode: debouncedCode || undefined,
        currency: currency || undefined,
      }),
  });

  const cur = currencyLabel(data?.currency ?? currency);
  const money = (n: number) => formatMoney(n, cur);

  const slices: Slice[] = data
    ? AGING_BUCKETS.map((b, i) => ({
        key: b.key,
        label: b.label,
        value: data.summary[b.key].totalDue,
        color: BUCKET_COLORS[i],
      }))
    : [];
  const overdueTotal = data
    ? data.summary.days1To30.totalDue + data.summary.days31To60.totalDue + data.summary.days61To90.totalDue + data.summary.daysOver90.totalDue
    : 0;
  const share = data && data.summary.grandTotal.totalDue > 0 ? Math.round((overdueTotal / data.summary.grandTotal.totalDue) * 100) : 0;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Ancienneté des créances"
        subtitle="Soldes dus classés par tranche de retard"
        action={
          <ActionButton variant="ghost" icon={BarChart3} pending={isFetching && !isLoading} onClick={() => refetch()}>
            Actualiser
          </ActionButton>
        }
      />

      <div className="grid grid-cols-1 gap-3 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm md:grid-cols-3">
        <Field label="Type de client">
          <select value={customerType} onChange={(e) => setCustomerType(e.target.value)} className={FIELD_SOFT}>
            <option value="">Tous les types</option>
            {Object.entries(CUSTOMER_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Code client">
          <input value={customerCode} onChange={(e) => setCustomerCode(e.target.value)} className={FIELD_SOFT} placeholder="CUS-0001" />
        </Field>
        <Field label="Devise">
          <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className={FIELD_SOFT} placeholder="XAF" />
        </Field>
      </div>

      {isLoading ? (
        <div className="space-y-5">
          <KpiRowSkeleton count={4} />
          <Skeleton className="h-72 w-full rounded-[1.75rem]" />
          <ListSkeleton rows={5} />
        </div>
      ) : isError || !data ? (
        <ErrorBlock message="Impossible de charger l'état des créances." onRetry={() => refetch()} />
      ) : (
        <>
          <KpiRow
            columns={4}
            items={[
              { label: "Total à recouvrer", value: money(data.summary.grandTotal.totalDue), hint: `${data.summary.grandTotal.count} document${data.summary.grandTotal.count > 1 ? "s" : ""}`, tone: "pink" },
              { label: "Non échu", value: money(data.summary.current.totalDue), hint: `${data.summary.current.count} document${data.summary.current.count > 1 ? "s" : ""}`, tone: "success" },
              { label: "En retard", value: money(overdueTotal), hint: `${share} % du total`, tone: overdueTotal > 0 ? "danger" : "default" },
              { label: "Plus de 90 jours", value: money(data.summary.daysOver90.totalDue), hint: `${data.summary.daysOver90.count} document${data.summary.daysOver90.count > 1 ? "s" : ""}`, tone: data.summary.daysOver90.totalDue > 0 ? "danger" : "default" },
            ]}
          />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
            <ChartCard className="xl:col-span-3" title="Soldes dus par tranche" subtitle={`Montants en ${cur}`}>
              <ColumnChart data={slices} />
            </ChartCard>
            <ChartCard className="xl:col-span-2" title="Répartition" subtitle="Part de chaque tranche dans le total">
              <DonutBreakdown data={slices} centerLabel="du total" />
            </ChartCard>
          </div>

          {data.documents.length === 0 ? (
            <EmptyState icon={BarChart3} title="Aucune créance" hint="Aucun document n'a de solde dû pour ces critères." />
          ) : (
            <>
              <h3 className="px-1 pt-2 text-base font-bold text-gray-950">Documents concernés</h3>
              <HeadRow cols={COLS}>
                <span>Document</span>
                <span>Client</span>
                <span>Échéance</span>
                <span className="text-right">Solde dû</span>
                <span className="text-right">Tranche</span>
              </HeadRow>
              <DataCard>
                {data.documents.map((doc) => (
                  <button
                    key={doc.documentNumber}
                    type="button"
                    onClick={() => navigate(`/billing/documents/${doc.documentNumber}`)}
                    className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl p-4 text-left transition max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}
                  >
                    <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{doc.documentNumber}</p>
                    <div className="lg:order-last lg:text-right">
                      <StatusChip tone={doc.daysOverdue > 60 ? "danger" : doc.daysOverdue > 0 ? "warn" : "success"}>
                        {BUCKET_LABEL[doc.agingBucket] ?? doc.agingBucket}
                      </StatusChip>
                    </div>
                    <div className="col-span-2 min-w-0 lg:col-span-1">
                      <p className="truncate font-semibold text-gray-950">{doc.customerName}</p>
                      <p className="truncate text-xs text-gray-400">
                        {CUSTOMER_TYPE_LABEL[doc.customerType] ?? doc.customerType} · {doc.customerCode}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(doc.dueDate)}
                      {doc.daysOverdue > 0 ? ` · ${doc.daysOverdue} j` : ""}
                    </p>
                    <p className="text-sm font-bold tabular-nums text-red-600 max-lg:text-right lg:text-right">{money(doc.balanceDue)}</p>
                  </button>
                ))}
              </DataCard>
            </>
          )}
        </>
      )}
    </div>
  );
};
