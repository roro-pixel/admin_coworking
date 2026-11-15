import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, DollarSign, Layers, Plus, Power, Trash2 } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type { PricingRuleQuote, ResourceBookingUnit, ResourcePricingRuleResponse, ResourceSummaryResponse } from "../../../services/resource.service";
import { ActionButton, DataCard, Detail, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, IconButton, ListHeader, PanelForm, Pagination, StatusChip, Tag } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatDate, formatMoney } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, UNITS, UNIT_LABEL, dayLabel, hhmm } from "../../../components/resources/resKit";
import { ResourceAutocomplete } from "../../../components/resources/ResourceAutocomplete";
import { BulkPricingRuleModal } from "../../../components/resources/Bulkpricingrulemodal";

const COLS = "lg:grid-cols-[minmax(0,1.1fr)_7rem_9rem_minmax(0,1.3fr)_6rem_auto]";
const SIZE = 15;

const adjust = (r: ResourcePricingRuleResponse) =>
  !r.adjustmentType ? "" : r.adjustmentType === "PERCENT_DELTA" ? `${r.adjustmentValue}%` : r.adjustmentType === "AMOUNT_DELTA" ? formatMoney(r.adjustmentValue ?? 0) : "Prix fixe";

const period = (r: ResourcePricingRuleResponse) => {
  const parts: string[] = [];
  if (r.dayOfWeek) parts.push(dayLabel(r.dayOfWeek));
  if (r.startsAt || r.endsAt) parts.push(`${hhmm(r.startsAt) || "00:00"} à ${hhmm(r.endsAt) || "24:00"}`);
  if (r.validFrom || r.validUntil) parts.push(`${r.validFrom ? formatDate(r.validFrom) : "dès maintenant"} au ${r.validUntil ? formatDate(r.validUntil) : "sans fin"}`);
  return parts.length ? parts.join(", ") : "Toujours applicable";
};

export const PricingRulesList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [resourceFilter, setResourceFilter] = useState("");
  const [selectedResource, setSelectedResource] = useState<ResourceSummaryResponse | null>(null);
  const [unitFilter, setUnitFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [quoting, setQuoting] = useState<{ resourceCode: string; bookingUnit: ResourceBookingUnit; startedAt: string; endedAt: string } | null>(null);
  const [quote, setQuote] = useState<PricingRuleQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["resource-pricing-rules", resourceFilter, page, unitFilter, activeFilter],
    queryFn: () =>
      resourceService.getPricingRules({
        resourceCode: resourceFilter || undefined,
        bookingUnit: (unitFilter || undefined) as ResourceBookingUnit | undefined,
        active: activeFilter === "" ? undefined : activeFilter === "true",
        page,
        size: SIZE,
      }),
  });
  const rules = data?.content ?? [];
  const total = data?.totalElements ?? 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["resource-pricing-rules"] });
  const toggle = useMutation({
    mutationFn: (r: ResourcePricingRuleResponse) => resourceService.updatePricingRuleActive(r.id, !r.active),
    onSuccess: refresh,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  const remove = useMutation({ mutationFn: (id: number) => resourceService.deletePricingRule(id), onSuccess: refresh });
  const quoteMutation = useMutation({
    mutationFn: () => resourceService.quotePrice(quoting!),
    onSuccess: (d) => {
      setQuote(d);
      setQuoteError(null);
    },
    onError: (e) => {
      setQuote(null);
      setQuoteError(apiMessage(e, "Impossible de calculer le tarif."));
    },
  });

  const hasFilters = !!(resourceFilter || unitFilter || activeFilter);
  const change = (fn: () => void) => { fn(); setPage(0); };
  const quoteReady = quoting && quoting.resourceCode && quoting.startedAt && quoting.endedAt && quoting.endedAt > quoting.startedAt;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Règles de prix"
        subtitle={isLoading ? undefined : `${total} règle${total > 1 ? "s" : ""} de tarification`}
        action={
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="ghost" icon={Calculator} onClick={() => { setQuote(null); setQuoteError(null); setQuoting({ resourceCode: "", bookingUnit: "HOUR", startedAt: "", endedAt: "" }); }}>Simulateur</ActionButton>
            <ActionButton variant="ghost" icon={Layers} onClick={() => setBulk(true)}>Plusieurs ressources</ActionButton>
            <ActionButton icon={Plus} onClick={() => navigate("/resources/pricing/create")}>Nouvelle règle</ActionButton>
          </div>
        }
      />

      <BulkPricingRuleModal isOpen={bulk} onClose={() => setBulk(false)} />

      {quoting && (
        <PanelForm
          title="Simulateur de prix"
          onCancel={() => setQuoting(null)}
          pending={quoteMutation.isPending}
          submitLabel="Calculer le prix"
          submitDisabled={!quoteReady}
          error={quoteError}
          onSubmit={(e) => { e.preventDefault(); quoteMutation.mutate(); }}
        >
          <Field label="Ressource" required>
            <ResourceAutocomplete selectedCode={quoting.resourceCode} onSelect={(r) => setQuoting({ ...quoting, resourceCode: r?.code || "" })} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Unité">
              <select value={quoting.bookingUnit} onChange={(e) => setQuoting({ ...quoting, bookingUnit: e.target.value as ResourceBookingUnit })} className={FIELD}>
                {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
              </select>
            </Field>
            <Field label="Début" required>
              <input type="datetime-local" value={quoting.startedAt} onChange={(e) => setQuoting({ ...quoting, startedAt: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Fin" required error={quoting.startedAt && quoting.endedAt && quoting.endedAt <= quoting.startedAt ? "La fin doit être après le début." : undefined}>
              <input type="datetime-local" value={quoting.endedAt} onChange={(e) => setQuoting({ ...quoting, endedAt: e.target.value })} className={FIELD} />
            </Field>
          </div>
          {quote && (
            <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-3">
              <Detail label="Prix de base">{formatMoney(quote.basePrice)}</Detail>
              <Detail label="Prix final">{formatMoney(quote.finalPrice)}</Detail>
              <Detail label="Règle appliquée">{quote.appliedRuleLabel || (quote.appliedRuleId ? `Règle n° ${quote.appliedRuleId}` : "Tarif de base")}</Detail>
            </div>
          )}
        </PanelForm>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <ResourceAutocomplete
            selectedResource={selectedResource}
            selectedCode={resourceFilter}
            onSelect={(r) => change(() => { setSelectedResource(r); setResourceFilter(r?.code || ""); })}
            placeholder="Filtrer par ressource"
          />
        </div>
        <FilterButton open={showFilters} active={!!(unitFilter || activeFilter)} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={() => change(() => { setResourceFilter(""); setSelectedResource(null); setUnitFilter(""); setActiveFilter(""); })}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Unité">
              <select value={unitFilter} onChange={(e) => change(() => setUnitFilter(e.target.value))} className={FIELD}>
                <option value="">Toutes les unités</option>
                {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
              </select>
            </Field>
            <Field label="État">
              <select value={activeFilter} onChange={(e) => change(() => setActiveFilter(e.target.value))} className={FIELD}>
                <option value="">Toutes</option>
                <option value="true">Actives</option>
                <option value="false">Inactives</option>
              </select>
            </Field>
          </div>
        </FilterPanel>
      )}

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les règles de prix." onRetry={() => refetch()} />
      ) : rules.length === 0 ? (
        <EmptyState icon={DollarSign} title="Aucune règle de prix" hint={hasFilters ? "Ajustez les filtres." : "Créez la première règle pour pouvoir facturer une ressource."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Ressource</span>
            <span>Unité</span>
            <span>Prix</span>
            <span>Conditions</span>
            <span>État</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {rules.map((r) => (
              <div key={r.id} className={`rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
                <div onClick={() => navigate(`/resources/pricing/${r.id}`)} className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 ${COLS}`}>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold text-gray-900">{r.resourceCode}</p>
                    {r.label && <p className="truncate text-xs text-gray-500">{r.label}</p>}
                  </div>
                  <Cell title="Unité" className="max-lg:order-3">
                    <Tag tone="gray">{UNIT_LABEL[r.bookingUnit] ?? r.bookingUnit}</Tag>
                  </Cell>
                  <Cell title="Prix" className="max-lg:order-4">
                    <span className="text-sm font-bold text-gray-950">{formatMoney(r.price)}</span>
                    {adjust(r) && <span className="block text-xs text-gray-500">{adjust(r)}</span>}
                  </Cell>
                  <Cell title="Conditions" className="max-lg:order-5 max-lg:col-span-2">
                    <span className="text-xs text-gray-600">{period(r)}</span>
                    {r.lastMinuteMinutes ? <span className="block text-xs font-semibold text-amber-700">Dernière minute: {r.lastMinuteMinutes} min</span> : null}
                  </Cell>
                  <div className="max-lg:order-2 max-lg:justify-self-end">
                    <StatusChip tone={r.active ? "success" : "neutral"}>{r.active ? "Active" : "Inactive"}</StatusChip>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 max-lg:order-6 max-lg:col-span-2 lg:justify-end">
                    <IconButton icon={Power} label={r.active ? "Désactiver" : "Activer"} tone={r.active ? "success" : "neutral"} pending={toggle.isPending && toggle.variables?.id === r.id} onClick={() => toggle.mutate(r)} />
                    <IconButton
                      icon={Trash2}
                      label="Supprimer"
                      tone="danger"
                      onClick={() =>
                        toast.confirm({
                          message: `Supprimer la règle ${r.label ? `« ${r.label} »` : `n° ${r.id}`} ?`,
                          confirmLabel: "Supprimer",
                          pendingLabel: "Suppression",
                          successMessage: "Règle supprimée",
                          errorMessage: "Suppression impossible",
                          onConfirm: () => remove.mutateAsync(r.id),
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </DataCard>
          <Pagination page={page} totalPages={data?.totalPages ?? 1} total={total} noun="règle" onChange={setPage} />
        </>
      )}
    </div>
  );
};
