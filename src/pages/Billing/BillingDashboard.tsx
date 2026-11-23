import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { billingService } from "../../services/billing.service";
import { ErrorBlock, Field, ItemRow, ListHeader } from "../../components/subscription/kit";
import { FIELD_SOFT, formatDate, formatMoney } from "../../components/subscription/kitUtils";
import { BarBreakdown, ChartCard, ColumnChart, KpiRow, KpiRowSkeleton, NoData } from "../../components/operations/OpsCharts";
import { CHART } from "../../components/subscription/chartColors";
import { DEAL_STAGE_LABEL } from "../../components/billing/billingLabels";

const iso = (d: Date) => d.toLocaleDateString("sv-SE");
const monthStart = () => { const d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth(), 1)); };
const num = (n?: number) => (n ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const pct = (n?: number) => (n == null ? "—" : `${num(n <= 1 ? n * 100 : n)} %`);

/** Tableau de bord commercial : devis, facturation, prévision d'encaissement, affaires, meilleurs clients. */
export const BillingDashboard: React.FC = () => {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(iso(new Date()));
  const [weeks, setWeeks] = useState("8");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["billing-dashboard", from, to, weeks],
    queryFn: () => billingService.getBillingDashboard({ from, to, weeks: Number(weeks) || undefined }),
  });
  const cur = data?.currency ?? "XAF";
  const money = (n?: number) => formatMoney(n ?? 0, cur === "XAF" ? "FCFA" : cur);

  return (
    <div className="space-y-5">
      <ListHeader title="Tableau de bord" subtitle="Indicateurs commerciaux de la période et prévision d'encaissement" />
      <div className="grid grid-cols-1 gap-4 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-3">
        <Field label="Du"><input type="date" className={FIELD_SOFT} value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Au"><input type="date" className={FIELD_SOFT} value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="Semaines de prévision"><input type="number" min={1} max={26} className={FIELD_SOFT} value={weeks} onChange={(e) => setWeeks(e.target.value)} /></Field>
      </div>

      {isLoading ? (
        <KpiRowSkeleton count={4} />
      ) : isError || !data ? (
        <ErrorBlock message="Impossible de charger le tableau de bord." onRetry={() => refetch()} />
      ) : (
        <>
          <ChartCard title="Devis" subtitle={`Du ${formatDate(data.from)} au ${formatDate(data.to)}`}>
            <KpiRow items={[
              { label: "Devis émis", value: data.quotes?.issued ?? 0, hint: money(data.quotes?.issuedAmount) },
              { label: "Convertis en facture", value: data.quotes?.converted ?? 0, hint: money(data.quotes?.convertedAmount), tone: "success" },
              { label: "Taux de conversion", value: pct(data.quotes?.conversionRate), tone: "pink" },
              { label: "Délai moyen de conversion", value: `${num(data.quotes?.averageDaysToInvoice)} j` },
            ]} />
          </ChartCard>

          <ChartCard title="Facturation" subtitle="Factures émises sur la période">
            <KpiRow columns={5} items={[
              { label: "Factures", value: data.invoicing?.invoices ?? 0 },
              { label: "Facturé", value: money(data.invoicing?.invoiced) },
              { label: "Encaissé", value: money(data.invoicing?.collected), tone: "success" },
              { label: "À encaisser", value: money(data.invoicing?.outstanding) },
              { label: "En retard", value: money(data.invoicing?.overdue), tone: (data.invoicing?.overdue ?? 0) > 0 ? "danger" : "default", hint: `Délai moyen de paiement ${num(data.invoicing?.averageDaysToPay)} j` },
            ]} />
          </ChartCard>

          <ChartCard title="Prévision d'encaissement" subtitle="Montants attendus par semaine d'échéance">
            {(data.forecast ?? []).length === 0 ? <NoData /> : (
              <ColumnChart data={data.forecast!.map((w) => ({ key: w.weekStart ?? "", label: formatDate(w.weekStart), value: w.expected ?? 0, color: CHART.primary }))} />
            )}
          </ChartCard>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard title="Affaires par étape" subtitle="Montant attendu">
              {(data.deals ?? []).length === 0 ? <NoData /> : (
                <BarBreakdown data={data.deals!.map((d, i) => ({ key: d.stage ?? String(i), label: `${DEAL_STAGE_LABEL[d.stage as keyof typeof DEAL_STAGE_LABEL] ?? d.stage} (${d.deals ?? 0})`, value: d.expectedAmount ?? 0, color: d.stage === "WON" ? CHART.success : d.stage === "LOST" ? CHART.neutral : CHART.primary }))} />
              )}
              {(data.deals ?? []).length > 0 && <p className="mt-3 text-xs text-gray-400">Pondéré par la probabilité : {money(data.deals!.reduce((s, d) => s + (d.weightedAmount ?? 0), 0))}</p>}
            </ChartCard>
            <ChartCard title="Meilleurs clients" subtitle="Facturé sur la période">
              {(data.topCustomers ?? []).length === 0 ? <NoData /> : (
                <div className="space-y-2">
                  {data.topCustomers!.map((c) => (
                    <ItemRow key={`${c.customerType}-${c.customerCode}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-semibold text-gray-900">{c.customerName ?? c.customerCode}</p>
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums">{money(c.invoiced)}</p>
                          {(c.outstanding ?? 0) > 0 && <p className="text-xs tabular-nums text-red-600">Reste {money(c.outstanding)}</p>}
                        </div>
                      </div>
                    </ItemRow>
                  ))}
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
};
