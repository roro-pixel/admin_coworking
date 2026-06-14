import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Eye, Loader2, Plus, PowerOff, Search, Tags } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { EntitlementDefinition } from "../../../services/subscription.service";
import {
  consumptionModeLabels,
  entitlementTypeLabels,
  resetPolicyLabels,
  unitLabels,
} from "./EntitlementDefinitionFields";

const PAGE_SIZE = 20;

export const EntitlementDefinitionsList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["entitlement-definitions", debouncedSearch, activeFilter, page],
    queryFn: () =>
      subscriptionService.getEntitlementDefinitions({
        query: debouncedSearch || undefined,
        active: activeFilter !== "" ? activeFilter === "true" : undefined,
        page,
        size: PAGE_SIZE,
      }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ code, active }: { code: string; active: boolean }) =>
      subscriptionService.updateEntitlementDefinition(code, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entitlement-definitions"] });
    },
    onError: () => {
      alert("Erreur lors de la mise à jour du statut.");
    },
  });

  const definitions = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalElements = data?.totalElements ?? definitions.length;

  const handleToggleActive = (event: React.MouseEvent, def: EntitlementDefinition) => {
    event.stopPropagation();
    const label = def.active ? "désactiver" : "réactiver";
    if (confirm(`Êtes-vous sûr de vouloir ${label} “${def.name}” ?`)) {
      toggleActiveMutation.mutate({ code: def.code, active: !def.active });
    }
  };

  const handleOpenDetail = (code: string) => {
    navigate(`/subscriptions/entitlements/${code}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-2xl bg-white shadow-sm shadow-gray-200/70 ring-1 ring-gray-100">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">
      Définitions de droits
    </h1>

    <p className="text-sm text-gray-500 mt-1">
      Centralisez les droits utilisés dans vos plans, passes, abonnements et
      règles de consommation.
    </p>
  </div>

  <button
    onClick={() => navigate("/subscriptions/entitlements/create")}
    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
  >
    <Plus size={18} />
    Nouveau droit
  </button>
</div>

      <div className="rounded-2xl bg-white p-4 shadow-sm shadow-gray-200/70 ring-1 ring-gray-100">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou code..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-28 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
            />
            {isFetching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">Recherche...</span>
            )}
          </div>

          <select
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value as "" | "true" | "false");
              setPage(0);
            }}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
          >
            <option value="">Tous les statuts</option>
            <option value="true">Actifs</option>
            <option value="false">Inactifs</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm shadow-gray-200/70 ring-1 ring-gray-100">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">{totalElements.toLocaleString("fr-FR")} droit{totalElements > 1 ? "s" : ""}</p>
            <p className="text-xs text-gray-500">Cliquez sur une ligne pour ouvrir le détail.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3">Droit</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Unité</th>
                <th className="px-5 py-3">Consommation</th>
                <th className="px-5 py-3">Reset</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {definitions.map((def) => (
                <tr
                  key={def.code}
                  onClick={() => handleOpenDetail(def.code)}
                  className={`group cursor-pointer transition hover:bg-primary-50/45 ${!def.active ? "opacity-70" : ""}`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-primary-50 p-2 text-primary-600 ring-1 ring-primary-100">
                        <Tags size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-primary-700">{def.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-gray-400">{def.code}</p>
                        {def.description && <p className="mt-1 line-clamp-1 max-w-md text-xs text-gray-500">{def.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-700">{entitlementTypeLabels[def.entitlementType] ?? def.entitlementType}</td>
                  <td className="px-5 py-4 text-gray-700">{unitLabels[def.unit] ?? def.unit}</td>
                  <td className="px-5 py-4 text-gray-700">{consumptionModeLabels[def.consumptionMode] ?? def.consumptionMode}</td>
                  <td className="px-5 py-4 text-gray-700">{resetPolicyLabels[def.resetPolicy] ?? def.resetPolicy}</td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                        def.active ? "bg-green-50 text-green-700 ring-green-100" : "bg-gray-100 text-gray-600 ring-gray-200"
                      }`}
                    >
                      {def.active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenDetail(def.code);
                        }}
                        className="rounded-lg p-2 text-gray-400 transition hover:bg-white hover:text-primary-600 hover:shadow-sm"
                        title="Voir le détail"
                      >
                        <Eye size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => handleToggleActive(event, def)}
                        disabled={toggleActiveMutation.isPending}
                        className={`rounded-lg p-2 transition hover:bg-white hover:shadow-sm ${
                          def.active ? "text-gray-400 hover:text-red-600" : "text-gray-400 hover:text-green-600"
                        }`}
                        title={def.active ? "Désactiver" : "Réactiver"}
                      >
                        <PowerOff size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {definitions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="mx-auto max-w-sm">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 ring-1 ring-gray-100">
                        <Tags size={22} />
                      </div>
                      <p className="mt-4 font-semibold text-gray-900">Aucun droit trouvé</p>
                      <p className="mt-1 text-sm text-gray-500">Créez un nouveau droit ou modifiez vos filtres de recherche.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
            <button
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} /> Précédent
            </button>
            <span className="text-sm text-gray-500">
              Page <span className="font-semibold text-gray-900">{page + 1}</span> / {totalPages}
            </span>
            <button
              onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              disabled={page >= totalPages - 1}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suivant <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
