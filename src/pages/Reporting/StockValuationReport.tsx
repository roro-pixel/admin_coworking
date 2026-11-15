import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Archive, MapPin, Package } from "lucide-react";
import { reportingService } from "../../services/reporting.service";
import { ChartCard, KpiRow, RatioBar } from "../../components/operations/OpsCharts";
import { RankBars, ValueDonut } from "../../components/reporting/ReportCharts";
import { ExportButton, RefreshButton, ReportBody, ReportHead, ReportTable, SelectField, Sub } from "../../components/reporting/reportKit";
import { fmtInt, fmtPct, money, rateColor, useExport } from "../../components/reporting/reportUtils";
import { Tabs, SearchField } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD_SOFT, formatDate } from "../../components/subscription/kitUtils";
import { CHART_COLORS } from "../../components/operations/opsChartData";
import { compactAmount } from "../../components/payment/paymentUtils";

type StockTab = "categories" | "locations" | "low" | "dead";

const DAYS = [15, 30, 60, 90, 180].map((d) => ({ value: d, label: `${d} jours sans mouvement` }));

export const StockValuationReport: React.FC = () => {
  const [inactiveDays, setInactiveDays] = useState(30);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<StockTab>("categories");
  const exporter = useExport();

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["stock-valuation", inactiveDays],
    queryFn: () => reportingService.getStockValuationReport({ inactiveDays }),
  });

  const categories = useMemo(() => data?.byCategory ?? [], [data]);
  const locations = useMemo(() => data?.byLocation ?? [], [data]);
  const lowStockItems = useMemo(() => data?.lowStockItems ?? [], [data]);
  const deadStockItems = useMemo(() => data?.deadStockItems ?? [], [data]);

  const q = search.trim().toLowerCase();
  const filteredLow = useMemo(
    () =>
      lowStockItems.filter(
        (i) =>
          (!selectedCategory || i.categoryName === selectedCategory) &&
          (!q || i.itemCode.toLowerCase().includes(q) || i.itemName.toLowerCase().includes(q) || i.categoryName.toLowerCase().includes(q)),
      ),
    [lowStockItems, selectedCategory, q],
  );
  const filteredDead = useMemo(
    () =>
      deadStockItems.filter(
        (i) =>
          (!selectedCategory || i.categoryName === selectedCategory) &&
          (!q ||
            i.itemCode.toLowerCase().includes(q) ||
            i.itemName.toLowerCase().includes(q) ||
            i.categoryName.toLowerCase().includes(q) ||
            i.locationName.toLowerCase().includes(q)),
      ),
    [deadStockItems, selectedCategory, q],
  );
  const categoryNames = useMemo(() => {
    const names = new Set<string>();
    [...categories, ...lowStockItems, ...deadStockItems].forEach((i) => i.categoryName && names.add(i.categoryName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [categories, lowStockItems, deadStockItems]);

  const tabs: TabItem<StockTab>[] = [
    { id: "categories", label: "Catégories", icon: Archive },
    { id: "locations", label: "Emplacements", icon: MapPin },
    { id: "low", label: "Stock faible", icon: AlertTriangle, count: lowStockItems.length },
    { id: "dead", label: "Stock mort", icon: Package, count: deadStockItems.length },
  ];
  const filterable = tab === "low" || tab === "dead";

  return (
    <div className="space-y-6">
      <ReportHead title="Valorisation du stock" subtitle="Valeur par catégorie et emplacement, articles à réapprovisionner et stock mort">
        <SelectField label="Seuil de stock mort" value={inactiveDays} options={DAYS} onChange={setInactiveDays} />
        <ExportButton label="PDF" busy={exporter.busy === "pdf"} onClick={() => exporter.run("pdf", () => reportingService.exportStockValuationPdf({ inactiveDays }), "rapport-valorisation-stock.pdf")} />
        <RefreshButton fetching={isFetching} onClick={() => refetch()} />
      </ReportHead>

      <ReportBody loading={isLoading} error={isError} hasData={!!data} onRetry={() => refetch()}>
        {data && (
          <>
            <KpiRow
              items={[
                { label: "Valeur totale", value: money(data.totalValue), tone: "pink", hint: `${fmtInt(data.totalItems)} article${data.totalItems > 1 ? "s" : ""}` },
                { label: "Catégories", value: fmtInt(categories.length) },
                { label: "Emplacements", value: fmtInt(data.totalLocations) },
                {
                  label: "Alertes stock",
                  value: fmtInt(lowStockItems.length + deadStockItems.length),
                  tone: lowStockItems.length + deadStockItems.length > 0 ? "danger" : "default",
                  hint: `${lowStockItems.length} faibles · ${deadStockItems.length} morts`,
                },
              ]}
            />

            <Tabs variant="soft" items={tabs} active={tab} onChange={setTab} />

            {tab === "categories" && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ChartCard title="Valeur par catégorie">
                  <ValueDonut
                    centerLabel="en stock"
                    format={money}
                    centerFormat={compactAmount}
                    data={categories.map((c, i) => ({ key: c.categoryCode, label: c.categoryName, value: c.totalValue, color: CHART_COLORS[i % CHART_COLORS.length] }))}
                  />
                </ChartCard>
                <ChartCard title="Détail par catégorie">
                  <ReportTable
                    cols={[
                      { key: "n", label: "Catégorie", width: "minmax(0,1.4fr)" },
                      { key: "i", label: "Articles", align: "right" },
                      { key: "q", label: "Quantité", align: "right" },
                      { key: "v", label: "Valeur", align: "right", width: "minmax(0,1.3fr)" },
                    ]}
                    rows={categories.map((c) => ({
                      id: c.categoryCode,
                      cells: {
                        n: (<><span className="block truncate font-semibold text-gray-950">{c.categoryName}</span><Sub>{fmtPct(c.percentage)} de la valeur</Sub></>),
                        i: fmtInt(c.itemCount),
                        q: fmtInt(c.totalQuantity),
                        v: <b className="text-gray-950">{money(c.totalValue)}</b>,
                      },
                    }))}
                  />
                </ChartCard>
              </div>
            )}

            {tab === "locations" && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ChartCard title="Valeur par emplacement">
                  <RankBars format={money} items={locations.map((l) => ({ key: l.locationCode, label: l.locationName, sub: l.locationType, value: l.totalValue }))} />
                </ChartCard>
                <ChartCard title="Détail par emplacement">
                  <ReportTable
                    cols={[
                      { key: "n", label: "Emplacement", width: "minmax(0,1.4fr)" },
                      { key: "i", label: "Articles", align: "right" },
                      { key: "q", label: "Quantité", align: "right" },
                      { key: "p", label: "Part", align: "right", width: "4.5rem" },
                    ]}
                    rows={locations.map((l) => ({
                      id: l.locationCode,
                      cells: {
                        n: (<><span className="block truncate font-semibold text-gray-950">{l.locationName}</span><Sub>{l.locationType}</Sub></>),
                        i: fmtInt(l.itemCount),
                        q: fmtInt(l.totalQuantity),
                        p: fmtPct(l.percentage, 0),
                      },
                    }))}
                  />
                </ChartCard>
              </div>
            )}

            {filterable && (
              <ChartCard
                title={tab === "low" ? "Articles à réapprovisionner" : `Stock sans mouvement depuis ${inactiveDays} jours`}
                subtitle={`${fmtInt(tab === "low" ? filteredLow.length : filteredDead.length)} ligne${(tab === "low" ? filteredLow.length : filteredDead.length) > 1 ? "s" : ""}`}
              >
                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select aria-label="Catégorie" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className={FIELD_SOFT}>
                    <option value="">Toutes les catégories</option>
                    {categoryNames.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <SearchField value={search} onChange={setSearch} placeholder="Article, code, emplacement" />
                </div>
                {tab === "low" ? (
                  <ReportTable
                    empty="Aucun article sous le point de réapprovisionnement."
                    cols={[
                      { key: "n", label: "Article", width: "minmax(0,1.5fr)" },
                      { key: "c", label: "Catégorie" },
                      { key: "lvl", label: "Niveau", width: "minmax(0,1.2fr)" },
                      { key: "o", label: "À commander", align: "right" },
                    ]}
                    rows={filteredLow.map((i) => ({
                      id: i.itemCode,
                      cells: {
                        n: (<><span className="block truncate font-semibold text-gray-950">{i.itemName}</span><Sub>{i.itemCode}</Sub></>),
                        c: i.categoryName,
                        lvl: (
                          <div>
                            <RatioBar value={i.quantityAvailable} total={i.reorderPoint} color={rateColor(i.reorderPoint > 0 ? (i.quantityAvailable / i.reorderPoint) * 100 : 0)} />
                            <Sub>{fmtInt(i.quantityAvailable)} disponibles · seuil {fmtInt(i.reorderPoint)}</Sub>
                          </div>
                        ),
                        o: <b className="text-gray-950">{fmtInt(i.reorderQuantity)}</b>,
                      },
                    }))}
                  />
                ) : (
                  <ReportTable
                    empty="Aucun stock mort détecté pour ce seuil."
                    cols={[
                      { key: "n", label: "Article", width: "minmax(0,1.5fr)" },
                      { key: "c", label: "Catégorie" },
                      { key: "l", label: "Emplacement" },
                      { key: "q", label: "Quantité", align: "right" },
                      { key: "v", label: "Valeur", align: "right" },
                      { key: "d", label: "Dernier mouvement", align: "right" },
                    ]}
                    rows={filteredDead.map((i) => ({
                      id: `${i.itemCode}-${i.locationName}`,
                      cells: {
                        n: (<><span className="block truncate font-semibold text-gray-950">{i.itemName}</span><Sub>{i.itemCode}</Sub></>),
                        c: i.categoryName,
                        l: i.locationName,
                        q: fmtInt(i.quantityOnHand),
                        v: <b className="text-gray-950">{money(i.stockValue)}</b>,
                        d: (<><span>{formatDate(i.lastMovementDate)}</span><Sub>il y a {fmtInt(i.daysSinceLastMovement)} jours</Sub></>),
                      },
                    }))}
                  />
                )}
              </ChartCard>
            )}
          </>
        )}
      </ReportBody>
    </div>
  );
};
