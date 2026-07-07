import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  Boxes,
  Download,
  MapPin,
  Package,
  RefreshCw,
  Search,
} from "lucide-react";
import { reportingService } from "../../services/reporting.service";

const formatFCFA = (amount?: number | null) =>
  `${(amount ?? 0).toLocaleString("fr-FR")} XAF`;

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("fr-FR") : "—";

const ButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-gray-700 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50 disabled:opacity-50";

type StockTab = "categories" | "locations" | "low" | "dead";

export const StockValuationReport: React.FC = () => {
  const [inactiveDays, setInactiveDays] = useState(30);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<StockTab>("categories");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["stock-valuation", inactiveDays],
    queryFn: () => reportingService.getStockValuationReport({ inactiveDays }),
  });

  const categories = data?.byCategory ?? [];
  const locations = data?.byLocation ?? [];
  const lowStockItems = data?.lowStockItems ?? [];
  const deadStockItems = data?.deadStockItems ?? [];

  const filteredLowStock = useMemo(() => {
    const q = search.trim().toLowerCase();

    return lowStockItems.filter((item) => {
      const matchesCategory =
        !selectedCategory || item.categoryName === selectedCategory;
      const matchesSearch =
        !q ||
        item.itemCode.toLowerCase().includes(q) ||
        item.itemName.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [lowStockItems, search, selectedCategory]);

  const filteredDeadStock = useMemo(() => {
    const q = search.trim().toLowerCase();

    return deadStockItems.filter((item) => {
      const matchesCategory =
        !selectedCategory || item.categoryName === selectedCategory;
      const matchesSearch =
        !q ||
        item.itemCode.toLowerCase().includes(q) ||
        item.itemName.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q) ||
        item.locationName.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [deadStockItems, search, selectedCategory]);

  const categoryNames = useMemo(() => {
    const names = new Set<string>();

    categories.forEach((item) => item.categoryName && names.add(item.categoryName));
    lowStockItems.forEach((item) => item.categoryName && names.add(item.categoryName));
    deadStockItems.forEach((item) => item.categoryName && names.add(item.categoryName));

    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [categories, lowStockItems, deadStockItems]);

  const download = async () => {
    const blob = await reportingService.exportStockValuationPdf({
      inactiveDays,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "rapport-valorisation-stock.pdf";
    a.click();

    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <RefreshCw className="mx-auto mb-3 animate-spin text-primary-500" />
        <p className="text-sm font-semibold text-gray-500">
          Chargement de la valorisation du stock...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gray-50 p-4 ring-1 ring-gray-100 md:p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <h2 className="text-xl font-black text-gray-950">
              Valorisation du stock
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Valeur par catégorie, emplacement, articles à réapprovisionner et stock mort.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className={ButtonClass}
            >
              <RefreshCw
                size={16}
                className={isFetching ? "animate-spin" : ""}
              />
              Actualiser
            </button>

            <button onClick={download} className={ButtonClass}>
              <Download size={16} />
              Export PDF
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[180px_240px_1fr]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-400">
              Stock mort
            </span>
            <select
              value={inactiveDays}
              onChange={(e) => setInactiveDays(Number(e.target.value))}
              className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
            >
              <option value={15}>15 jours</option>
              <option value={30}>30 jours</option>
              <option value={60}>60 jours</option>
              <option value={90}>90 jours</option>
              <option value={180}>180 jours</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-400">
              Catégorie
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
            >
              <option value="">Toutes les catégories</option>
              {categoryNames.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-400">
              Recherche
            </span>
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Article, code, emplacement..."
                className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
              />
            </div>
          </label>
        </div>
      </section>

      {data && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={Archive}
              label="Valeur totale"
              value={formatFCFA(data.totalValue)}
              text={`${data.totalItems} article(s)`}
            />
            <KpiCard
              icon={Boxes}
              label="Catégories"
              value={categories.length}
              text="Répartition par famille"
            />
            <KpiCard
              icon={MapPin}
              label="Emplacements"
              value={data.totalLocations}
              text="Zones de stockage"
            />
            <KpiCard
              icon={AlertTriangle}
              label="Alertes stock"
              value={lowStockItems.length + deadStockItems.length}
              text={`${lowStockItems.length} faibles · ${deadStockItems.length} morts`}
            />
          </section>

          <section className="rounded-[2rem] bg-white p-2 shadow-sm ring-1 ring-gray-100">
            <div className="grid gap-2 md:grid-cols-4">
              <TabButton
                active={tab === "categories"}
                icon={Archive}
                label="Catégories"
                onClick={() => setTab("categories")}
              />
              <TabButton
                active={tab === "locations"}
                icon={MapPin}
                label="Emplacements"
                onClick={() => setTab("locations")}
              />
              <TabButton
                active={tab === "low"}
                icon={AlertTriangle}
                label="Stock faible"
                onClick={() => setTab("low")}
              />
              <TabButton
                active={tab === "dead"}
                icon={Package}
                label="Stock mort"
                onClick={() => setTab("dead")}
              />
            </div>
          </section>

          {tab === "categories" && (
            <DataTable
              title="Valeur par catégorie"
              columns={["Catégorie", "Articles", "Quantité", "Valeur", "Part"]}
              rows={categories.map((item) => [
                item.categoryName,
                item.itemCount,
                item.totalQuantity,
                formatFCFA(item.totalValue),
                `${item.percentage.toFixed(1)}%`,
              ])}
            />
          )}

          {tab === "locations" && (
            <DataTable
              title="Valeur par emplacement"
              columns={["Emplacement", "Type", "Articles", "Quantité", "Valeur", "Part"]}
              rows={locations.map((item) => [
                item.locationName,
                item.locationType,
                item.itemCount,
                item.totalQuantity,
                formatFCFA(item.totalValue),
                `${item.percentage.toFixed(1)}%`,
              ])}
            />
          )}

          {tab === "low" && (
            <DataTable
              title="Articles à réapprovisionner"
              emptyText="Aucun article sous le point de réapprovisionnement."
              columns={["Article", "Code", "Catégorie", "Disponible", "Seuil", "À commander"]}
              rows={filteredLowStock.map((item) => [
                item.itemName,
                item.itemCode,
                item.categoryName,
                item.quantityAvailable,
                item.reorderPoint,
                item.reorderQuantity,
              ])}
            />
          )}

          {tab === "dead" && (
            <DataTable
              title={`Stock sans mouvement depuis ${inactiveDays} jours`}
              emptyText="Aucun stock mort détecté pour ce seuil."
              columns={["Article", "Code", "Catégorie", "Emplacement", "Quantité", "Valeur", "Dernier mouvement", "Jours"]}
              rows={filteredDeadStock.map((item) => [
                item.itemName,
                item.itemCode,
                item.categoryName,
                item.locationName,
                item.quantityOnHand,
                formatFCFA(item.stockValue),
                formatDate(item.lastMovementDate),
                item.daysSinceLastMovement,
              ])}
            />
          )}
        </>
      )}

      {!data && (
        <div className="rounded-[2rem] bg-white p-12 text-center shadow-sm ring-1 ring-gray-100">
          <Archive className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">
            Aucune donnée disponible.
          </p>
        </div>
      )}
    </div>
  );
};

function KpiCard({
  icon: Icon,
  label,
  value,
  text,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  text: string;
}) {
  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        <Icon size={21} />
      </div>
      <p className="text-sm font-bold text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-gray-950">{value}</p>
      <p className="mt-1 text-xs font-semibold text-gray-400">{text}</p>
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-[1.35rem] px-4 py-3 text-sm font-black transition ${
        active
          ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <Icon size={17} />
      {label}
    </button>
  );
}

function DataTable({
  title,
  columns,
  rows,
  emptyText = "Aucune donnée disponible.",
}: {
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  emptyText?: string;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-gray-100">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-lg font-black text-gray-950">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {rows.length} ligne{rows.length > 1 ? "s" : ""}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="p-10 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">{emptyText}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-400"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, index) => (
                <tr key={index} className="transition hover:bg-gray-50">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-5 py-4 text-sm ${
                        cellIndex === 0
                          ? "font-black text-gray-900"
                          : "font-semibold text-gray-600"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
