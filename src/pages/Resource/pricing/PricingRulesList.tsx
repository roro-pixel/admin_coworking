import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, DollarSign, Power, Calculator, X } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type {
  ResourcePricingRuleResponse,
  ResourceBookingUnit,
  ResourceSummaryResponse,
} from "../../../services/resource.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { ResourceAutocomplete } from "../../../components/resources/ResourceAutocomplete";

const bookingUnitLabels: Record<string, string> = {
  HOUR: "Heure",
  HALF_DAY: "Demi-journée",
  DAY: "Jour",
  WEEK: "Semaine",
  MONTH: "Mois",
};

const formatMoney = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

const formatPeriod = (rule: ResourcePricingRuleResponse) => {
  const parts: string[] = [];
  if (rule.validFrom)
    parts.push(`Du ${new Date(rule.validFrom).toLocaleDateString("fr-FR")}`);
  if (rule.validUntil)
    parts.push(`au ${new Date(rule.validUntil).toLocaleDateString("fr-FR")}`);
  if (rule.startsAt || rule.endsAt)
    parts.push(
      `${rule.startsAt?.slice(0, 5) ?? "--:--"}–${rule.endsAt?.slice(0, 5) ?? "--:--"}`,
    );
  return parts.length ? parts.join(" · ") : "Toujours applicable";
};

export const PricingRulesList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [selectedResourceSummary, setSelectedResourceSummary] =
    useState<ResourceSummaryResponse | null>(null);

  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState<{
    resourceCode: string;
    bookingUnit: ResourceBookingUnit;
    startedAt: string;
    endedAt: string;
  }>({ resourceCode: "", bookingUnit: "HOUR", startedAt: "", endedAt: "" });
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ["resource-pricing-rules", resourceFilter],
    queryFn: () =>
      resourceService.getPricingRules({
        resourceCode: resourceFilter || undefined,
        size: 200,
      }),
  });

  const rules: ResourcePricingRuleResponse[] = rulesData?.content || [];

  const filteredRules = search
    ? rules.filter(
        (r) =>
          r.resourceCode.toLowerCase().includes(search.toLowerCase()) ||
          (r.label ?? "").toLowerCase().includes(search.toLowerCase()) ||
          r.bookingUnit.toLowerCase().includes(search.toLowerCase()),
      )
    : rules;

  const stats = useMemo(() => {
    const active = rules.filter((r) => r.active).length;
    const dynamic = rules.filter((r) => r.adjustmentType).length;
    const avg = rules.length
      ? Math.round(rules.reduce((sum, r) => sum + r.price, 0) / rules.length)
      : 0;
    return { total: rules.length, active, dynamic, avg };
  }, [rules]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => resourceService.deletePricingRule(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["resource-pricing-rules"] }),
    onError: () => alert("Erreur lors de la suppression de la règle."),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      resourceService.updatePricingRuleActive(id, active),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["resource-pricing-rules"] }),
    onError: () => alert("Erreur lors de la mise à jour du statut."),
  });

  const handleDelete = (id: number) => {
    if (
      confirm(
        "Êtes-vous sûr de vouloir supprimer cette règle de tarification ?",
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setResourceFilter("");
    setSelectedResourceSummary(null);
  };

  if (isLoading) {
    return <div className="text-center py-10 text-gray-500">Chargement...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Règles de tarification
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Gérez les prix par ressource, unité, période et règle dynamique.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setIsQuoteOpen(true);
              setQuoteResult(null);
              setQuoteError(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <Calculator size={16} />
            Simulateur
          </button>
          <button
            onClick={() => navigate("/resources/pricing/create")}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
          >
            <Plus size={16} />
            Nouvelle règle
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs font-medium text-gray-400">Total règles</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs font-medium text-gray-400">Actives</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {stats.active}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs font-medium text-gray-400">Dynamiques</p>
          <p className="mt-2 text-2xl font-bold text-primary-700">
            {stats.dynamic}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs font-medium text-gray-400">Prix moyen</p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {formatMoney(stats.avg)}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="w-full md:w-80">
            <ResourceAutocomplete
              selectedResource={selectedResourceSummary}
              selectedCode={resourceFilter}
              onSelect={(resource) => {
                setSelectedResourceSummary(resource);
                setResourceFilter(resource?.code || "");
              }}
              placeholder="Filtrer par ressource..."
            />
          </div>
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Rechercher par code, label ou unité..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          {(resourceFilter || search) && (
            <button
              onClick={resetFilters}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-50/70 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-6 py-4">Ressource</th>
                <th className="px-6 py-4">Unité</th>
                <th className="px-6 py-4 text-right">Prix</th>
                <th className="px-6 py-4">Règle</th>
                <th className="px-6 py-4">Période</th>
                <th className="px-6 py-4 text-center">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((rule) => (
                <tr
                  key={rule.id}
                  onClick={() => navigate(`/resources/pricing/${rule.id}`)}
                  className={`group cursor-pointer transition hover:bg-primary-50/40 ${!rule.active ? "opacity-60" : ""}`}
                >
                  <td className="px-6 py-4 align-top">
                    <p className="font-mono text-sm font-medium text-gray-900">
                      {rule.resourceCode}
                    </p>
                    {rule.dayOfWeek && (
                      <p className="mt-1 text-xs text-gray-400">
                        Jour {rule.dayOfWeek}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top text-sm text-gray-700">
                    {bookingUnitLabels[rule.bookingUnit] || rule.bookingUnit}
                  </td>
                  <td className="px-6 py-4 align-top text-right font-semibold text-gray-900">
                    {formatMoney(rule.price)}
                  </td>
                  <td className="px-6 py-4 align-top text-sm">
                    {rule.label && (
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {rule.label}
                      </span>
                    )}
                    {rule.adjustmentType && (
                      <p className="mt-1 text-xs text-gray-500">
                        {rule.adjustmentType === "PERCENT_DELTA"
                          ? `${rule.adjustmentValue}%`
                          : rule.adjustmentType === "AMOUNT_DELTA"
                            ? `${rule.adjustmentValue?.toLocaleString("fr-FR")} FCFA`
                            : "Prix fixe"}
                      </p>
                    )}
                    {!rule.label && !rule.adjustmentType && (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top text-xs text-gray-500">
                    {formatPeriod(rule)}
                    {rule.lastMinuteMinutes && (
                      <p className="mt-1 font-medium text-orange-600">
                        Last minute {rule.lastMinuteMinutes} min
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top text-center">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        rule.active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {rule.active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-6 py-4 align-top text-right">
                    <div
                      className="flex justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: rule.id,
                            active: !rule.active,
                          })
                        }
                        disabled={toggleActiveMutation.isPending}
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40"
                        title={rule.active ? "Désactiver" : "Activer"}
                      >
                        <Power size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                        title="Supprimer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredRules.length === 0 && (
        <div className="mt-4 rounded-2xl bg-white py-12 text-center shadow-sm ring-1 ring-gray-100">
          <DollarSign size={44} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Aucune règle de tarification trouvée</p>
        </div>
      )}

      {isQuoteOpen && (
        <ModalPortal onClose={() => setIsQuoteOpen(false)} size="lg">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 rounded-t-2xl">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Simulateur de prix
              </h3>
              <p className="mt-0.5 text-sm text-gray-500">
                Calculez le prix appliqué pour une ressource.
              </p>
            </div>
            <button
              onClick={() => setIsQuoteOpen(false)}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>
          <div className="space-y-5 p-6">
            {quoteError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {quoteError}
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Ressource *
              </label>
              <ResourceAutocomplete
                selectedCode={quoteForm.resourceCode}
                onSelect={(resource) =>
                  setQuoteForm({
                    ...quoteForm,
                    resourceCode: resource?.code || "",
                  })
                }
                placeholder="Rechercher une ressource..."
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Unité *
                </label>
                <select
                  value={quoteForm.bookingUnit}
                  onChange={(e) =>
                    setQuoteForm((f) => ({
                      ...f,
                      bookingUnit: e.target.value as ResourceBookingUnit,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                >
                  {Object.entries(bookingUnitLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Début *
                </label>
                <input
                  type="datetime-local"
                  value={quoteForm.startedAt}
                  onChange={(e) =>
                    setQuoteForm((f) => ({ ...f, startedAt: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Fin *
                </label>
                <input
                  type="datetime-local"
                  value={quoteForm.endedAt}
                  onChange={(e) =>
                    setQuoteForm((f) => ({ ...f, endedAt: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>
            </div>
            <button
              disabled={
                !quoteForm.resourceCode ||
                !quoteForm.startedAt ||
                !quoteForm.endedAt ||
                quoteLoading
              }
              onClick={async () => {
                setQuoteLoading(true);
                setQuoteError(null);
                setQuoteResult(null);
                try {
                  const result = await resourceService.quotePrice(quoteForm);
                  setQuoteResult(result);
                } catch (e: any) {
                  setQuoteError(e?.response?.data?.message || "Erreur");
                }
                setQuoteLoading(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              <Calculator size={16} />
              {quoteLoading ? "Calcul..." : "Calculer le prix"}
            </button>
            {quoteResult && (
              <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Prix de base</span>
                  <span className="font-medium">
                    {formatMoney(quoteResult.basePrice ?? 0)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-lg font-bold text-green-700">
                  <span>Prix final</span>
                  <span>{formatMoney(quoteResult.finalPrice ?? 0)}</span>
                </div>
                {quoteResult.appliedRuleLabel && (
                  <p className="mt-2 text-xs text-gray-500">
                    Règle appliquée :{" "}
                    <span className="font-medium">
                      {quoteResult.appliedRuleLabel}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
