import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingCatalogLookupItem } from "../../services/billing.service";
import { DataCard, EmptyState, ErrorBlock, HeadRow, ListHeader, Pagination, SearchField, Tag } from "../../components/subscription/kit";
import { FIELD_SOFT, ROW_HOVER, formatMoney } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { currencyLabel } from "../../components/payment/paymentUtils";
import { SOURCE_TYPE_LABEL } from "../../components/billing/billingLabels";

const COLS = "lg:grid-cols-[9rem_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_10rem]";

export const BillingCatalogLookupPanel: React.FC = () => {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["billing-catalog-lookup", debouncedQ, source, category, page],
    queryFn: () => billingService.catalogLookup({ q: debouncedQ || undefined, source: source || undefined, category: category || undefined, page, size: 20 }),
  });

  const items: BillingCatalogLookupItem[] = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-5">
      <ListHeader title="Recherche catalogue facturable" subtitle="Éléments réutilisables pour les lignes de devis et de factures." />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <SearchField value={q} onChange={setQ} placeholder="Rechercher un élément" />
        <select
          className={`${FIELD_SOFT} bg-white shadow-sm`}
          value={source}
          aria-label="Source"
          onChange={(e) => {
            setSource(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Toutes les sources</option>
          <option value="SERVICE_CATALOG">{SOURCE_TYPE_LABEL.SERVICE_CATALOG}</option>
          <option value="INVENTORY_ITEM">{SOURCE_TYPE_LABEL.INVENTORY_ITEM}</option>
          <option value="RESOURCE">{SOURCE_TYPE_LABEL.RESOURCE}</option>
        </select>
        <input
          className={`${FIELD_SOFT} bg-white shadow-sm`}
          placeholder="Catégorie"
          aria-label="Catégorie"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(0);
          }}
        />
      </div>

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger le catalogue." onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Search} title="Aucun élément trouvé" hint="Modifiez la recherche ou les filtres." />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Code</span>
            <span>Nom</span>
            <span>Source</span>
            <span>Catégorie</span>
            <span className="text-right">Prix</span>
          </HeadRow>
          <DataCard>
            {items.map((item) => (
              <div key={`${item.sourceType}-${item.sourceCode}`} className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl p-4 transition max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{item.sourceCode}</p>
                <p className="text-sm font-bold tabular-nums text-gray-950 lg:order-last lg:text-right">
                  {typeof item.unitPrice === "number" ? formatMoney(item.unitPrice, currencyLabel(item.currency)) : ""}
                </p>
                <div className="col-span-2 min-w-0 lg:col-span-1">
                  <p className="truncate font-semibold text-gray-950">{item.name}</p>
                  {item.description && <p className="truncate text-xs text-gray-400">{item.description}</p>}
                </div>
                <div>
                  <Tag>{SOURCE_TYPE_LABEL[item.sourceType] ?? item.sourceType}</Tag>
                </div>
                <p className="text-sm text-gray-500 max-lg:hidden">{item.category ?? ""}</p>
              </div>
            ))}
          </DataCard>
          <Pagination page={page} totalPages={totalPages} total={data?.totalElements ?? items.length} noun="élément" onChange={setPage} />
        </>
      )}
    </div>
  );
};
