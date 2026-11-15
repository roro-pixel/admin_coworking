import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CalendarCheck, CalendarX, DoorOpen, Eye, EyeOff, Plus, Power, Trash2 } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type { ResourceResponse, ResourceStatus } from "../../../services/resource.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, IconButton, ListHeader, Pagination, SearchField } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, STATUSES, STATUS_LABEL, StatusBadge, useDebounced } from "../../../components/resources/resKit";

const COLS = "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_5rem_8rem_auto]";
const PAGE_SIZE = 20;

export const ResourcesList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const q = useDebounced(search.trim());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["resources", page, typeFilter, groupFilter, statusFilter, q],
    queryFn: async () => {
      if (q) {
        // La recherche par nom passe par le serveur, sinon elle ne porterait que sur la page affichée
        return resourceService.advancedSearchResources({
          name: q,
          typeCode: typeFilter || undefined,
          groupCode: groupFilter || undefined,
          status: (statusFilter || undefined) as ResourceStatus | undefined,
          page,
          size: PAGE_SIZE,
          sort: "name,asc",
        });
      }
      return resourceService.getResources({
        typeCode: typeFilter || undefined,
        groupCode: groupFilter || undefined,
        status: (statusFilter || undefined) as ResourceStatus | undefined,
        page,
        size: PAGE_SIZE,
      });
    },
  });
  const typesQuery = useQuery({ queryKey: ["resource-types-list"], queryFn: () => resourceService.getResourceTypes({ size: 500 }) });
  const groupsQuery = useQuery({ queryKey: ["resource-groups-list"], queryFn: () => resourceService.getResourceGroups({ size: 500 }) });

  const resources = (data?.content ?? []) as Partial<ResourceResponse>[] as ResourceResponse[];
  const types = typesQuery.data?.content ?? [];
  const groups = groupsQuery.data?.content ?? [];
  const total = data?.totalElements ?? 0;
  const typeName = (r: ResourceResponse) => r.typeName || types.find((t) => t.code === r.typeCode)?.name || r.typeCode || "";
  const groupName = (r: ResourceResponse) => r.groupName || groups.find((g) => g.code === r.groupCode)?.name || r.groupCode || "";

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["resources"] });
  const onError = (fallback: string) => (e: unknown) => toast.error(apiMessage(e, fallback));
  const booking = useMutation({ mutationFn: (r: ResourceResponse) => resourceService.updateResourceBookingEnabled(r.code, !r.bookingEnabled), onSuccess: refresh, onError: onError("Modification de la réservabilité impossible") });
  const portal = useMutation({ mutationFn: (r: ResourceResponse) => resourceService.updateResourcePortalVisible(r.code, !r.portalVisible), onSuccess: refresh, onError: onError("Modification de la visibilité impossible") });
  const active = useMutation({ mutationFn: (r: ResourceResponse) => resourceService.updateResourceActive(r.code, !r.active), onSuccess: refresh, onError: onError("Changement d'état impossible") });
  const order = useMutation({ mutationFn: (v: { code: string; displayOrder: number }) => resourceService.updateResourceDisplayOrder(v.code, v.displayOrder), onSuccess: refresh, onError: onError("Modification de l'ordre impossible") });
  const remove = useMutation({ mutationFn: (code: string) => resourceService.deleteResource(code), onSuccess: refresh });

  const busy = (m: { isPending: boolean; variables?: unknown }, code: string) => m.isPending && (m.variables as { code?: string } | undefined)?.code === code;
  const hasFilters = !!(search || typeFilter || groupFilter || statusFilter);
  const change = (fn: () => void) => { fn(); setPage(0); };

  return (
    <div className="space-y-5">
      <ListHeader
        title="Ressources"
        subtitle={isLoading ? undefined : `${total} ressource${total > 1 ? "s" : ""} réservable${total > 1 ? "s" : ""}`}
        action={<ActionButton icon={Plus} onClick={() => navigate("/resources/create")}>Nouvelle ressource</ActionButton>}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={(v) => change(() => setSearch(v))} placeholder="Nom de la ressource" />
        <FilterButton open={showFilters} active={!!(typeFilter || groupFilter || statusFilter)} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={() => change(() => { setSearch(""); setTypeFilter(""); setGroupFilter(""); setStatusFilter(""); })}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Type">
              <select value={typeFilter} onChange={(e) => change(() => setTypeFilter(e.target.value))} className={FIELD}>
                <option value="">Tous les types</option>
                {types.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Groupe">
              <select value={groupFilter} onChange={(e) => change(() => setGroupFilter(e.target.value))} className={FIELD}>
                <option value="">Tous les groupes</option>
                {groups.map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
              </select>
            </Field>
            <Field label="Statut">
              <select value={statusFilter} onChange={(e) => change(() => setStatusFilter(e.target.value))} className={FIELD}>
                <option value="">Tous les statuts</option>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
          </div>
        </FilterPanel>
      )}

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les ressources." onRetry={() => refetch()} />
      ) : resources.length === 0 ? (
        <EmptyState icon={DoorOpen} title="Aucune ressource" hint={hasFilters ? "Ajustez la recherche ou les filtres." : "Créez la première salle, le premier bureau ou poste."} action={!hasFilters ? <ActionButton icon={Plus} onClick={() => navigate("/resources/create")}>Nouvelle ressource</ActionButton> : undefined} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Ressource</span>
            <span>Classement</span>
            <span>Places</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {resources.map((r) => {
              const hasOrder = typeof r.displayOrder === "number";
              return (
                <div key={r.code} className={`rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
                  <div onClick={() => navigate(`/resources/${r.code}`)} className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 ${COLS}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{r.name}</p>
                      <p className="font-mono text-xs text-gray-400">{r.code}</p>
                    </div>
                    <Cell title="Classement" className="max-lg:order-3 max-lg:col-span-2">
                      <span className="block truncate text-sm text-gray-700">{typeName(r) || "Sans type"}</span>
                      {groupName(r) && <span className="block truncate text-xs text-gray-400">{groupName(r)}</span>}
                    </Cell>
                    <Cell title="Places" className="max-lg:order-4 max-lg:col-span-2">
                      <span className="text-sm text-gray-700">{r.capacity ?? ""}</span>
                    </Cell>
                    <div className="max-lg:order-2 max-lg:justify-self-end">
                      <StatusBadge status={String(r.status)} />
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="flex flex-wrap items-center gap-1 max-lg:order-5 max-lg:col-span-2 lg:justify-end">
                      <IconButton icon={r.bookingEnabled ? CalendarCheck : CalendarX} label={r.bookingEnabled ? "Réservation ouverte, cliquer pour fermer" : "Réservation fermée, cliquer pour ouvrir"} tone={r.bookingEnabled ? "success" : "neutral"} pending={booking.isPending && booking.variables?.code === r.code} onClick={() => booking.mutate(r)} />
                      <IconButton icon={r.portalVisible ? Eye : EyeOff} label={r.portalVisible ? "Visible sur le portail, cliquer pour masquer" : "Masquée du portail, cliquer pour afficher"} tone={r.portalVisible ? "success" : "neutral"} pending={portal.isPending && portal.variables?.code === r.code} onClick={() => portal.mutate(r)} />
                      <IconButton icon={Power} label={r.active ? "Désactiver" : "Activer"} tone={r.active ? "success" : "neutral"} pending={active.isPending && active.variables?.code === r.code} onClick={() => active.mutate(r)} />
                      {hasOrder && (
                        <>
                          <IconButton icon={ArrowUp} label="Monter dans l'ordre d'affichage" disabled={(r.displayOrder ?? 0) <= 0} pending={busy(order, r.code)} onClick={() => order.mutate({ code: r.code, displayOrder: Math.max(0, (r.displayOrder ?? 0) - 1) })} />
                          <IconButton icon={ArrowDown} label="Descendre dans l'ordre d'affichage" pending={busy(order, r.code)} onClick={() => order.mutate({ code: r.code, displayOrder: (r.displayOrder ?? 0) + 1 })} />
                        </>
                      )}
                      <IconButton
                        icon={Trash2}
                        label="Supprimer"
                        tone="danger"
                        onClick={() =>
                          toast.confirm({
                            message: `Supprimer la ressource « ${r.name} » ?`,
                            detail: "Ses disponibilités et tarifs seront aussi concernés.",
                            confirmLabel: "Supprimer",
                            pendingLabel: "Suppression",
                            successMessage: "Ressource supprimée",
                            errorMessage: "Suppression impossible",
                            onConfirm: () => remove.mutateAsync(r.code),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={data?.totalPages ?? 1} total={total} noun="ressource" onChange={setPage} />
        </>
      )}
    </div>
  );
};
