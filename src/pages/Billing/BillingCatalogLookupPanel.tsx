import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingCatalogLookupItem } from "../../services/billing.service";

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

export const BillingCatalogLookupPanel: React.FC = () => {
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["billing-catalog-lookup", q, source, category, page],
    queryFn: () =>
      billingService.catalogLookup({
        q: q || undefined,
        source: source || undefined,
        category: category || undefined,
        page,
        size: 20,
      }),
  });

  const items: BillingCatalogLookupItem[] = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Recherche catalogue facturable
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Recherche les éléments réutilisables pour les lignes de devis/facture.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className={inputCls}
          placeholder="Recherche"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
        <select
          className={inputCls}
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Toutes sources</option>
          <option value="SERVICE_CATALOG">Catalogue de services</option>
          <option value="INVENTORY_ITEM">Article inventaire</option>
          <option value="RESOURCE">Ressource</option>
        </select>
        <input
          className={inputCls}
          placeholder="Catégorie"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(0);
          }}
        />
        <button
          onClick={() => refetch()}
          className="bg-primary-600 text-white rounded-lg px-4 py-2 inline-flex items-center justify-center gap-2 hover:bg-primary-700"
        >
          <Search size={16} /> Rechercher
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Nom
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Catégorie
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  Prix
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.sourceCode} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">
                    {item.sourceCode}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {item.sourceType}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {item.category || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {typeof item.unitPrice === "number"
                      ? item.unitPrice.toLocaleString("fr-FR")
                      : "-"}{" "}
                    {item.currency || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <div className="text-center py-10 text-gray-500 text-sm">
              Aucun élément trouvé.
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <button
            disabled={page <= 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-2 border rounded-lg disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="px-3 py-2 text-sm text-gray-500">
            Page {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-2 border rounded-lg disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
};
