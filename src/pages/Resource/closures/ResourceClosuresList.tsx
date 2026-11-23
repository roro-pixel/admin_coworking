import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarOff, Plus, Power, Trash2 } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type { ResourceClosureResponse, ResourceSummaryResponse } from "../../../services/resource.service";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, IconButton, ListHeader, PanelForm, Pagination, StatusChip, Tag } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatDateTime } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell } from "../../../components/resources/resKit";
import { ImpactedBookingsList } from "../../../components/resources/ImpactedBookings";
import { ResourceAutocomplete } from "../../../components/resources/ResourceAutocomplete";

const COLS = "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_6rem_6rem_auto]";
const SIZE = 15;
const KINDS: Record<string, string> = { CLOSURE: "Fermeture", MAINTENANCE: "Maintenance", CLEANING: "Nettoyage", PRIVATE_EVENT: "Événement privé", OTHER: "Autre" };
const RECURRENCES: Record<string, string> = { NONE: "Aucune", WEEKLY: "Chaque semaine", YEARLY: "Chaque année" };
const EMPTY = { resourceCode: "", startedAt: "", endedAt: "", reason: "", active: true, kind: "CLOSURE", recurrence: "NONE", recurrenceUntil: "", cancelBookings: false };

const durationLabel = (a: string, b: string) => {
  const minutes = Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  return [days ? `${days} j` : "", hours ? `${hours} h` : "", rest ? `${rest} min` : ""].filter(Boolean).join(" ");
};

export const ResourceClosuresList: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [resourceFilter, setResourceFilter] = useState("");
  const [selectedResource, setSelectedResource] = useState<ResourceSummaryResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [creating, setCreating] = useState<typeof EMPTY | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["resource-closures", resourceFilter, page, activeFilter],
    queryFn: () =>
      resourceService.getClosures({
        resourceCode: resourceFilter || undefined,
        active: activeFilter === "" ? undefined : activeFilter === "true",
        page,
        size: SIZE,
        sort: "startedAt,desc",
      }),
  });
  const closures = data?.content ?? [];
  const total = data?.totalElements ?? 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["resource-closures"] });
  const create = useMutation({
    mutationFn: () =>
      resourceService.createClosure({
        resourceCode: creating!.resourceCode,
        startedAt: creating!.startedAt,
        endedAt: creating!.endedAt,
        reason: creating!.reason.trim() || undefined,
        active: creating!.active,
        kind: creating!.kind,
        recurrence: creating!.recurrence,
        recurrenceUntil: creating!.recurrence === "NONE" ? undefined : creating!.recurrenceUntil || undefined,
        cancelBookings: creating!.cancelBookings,
      }),
    onSuccess: async () => {
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ["resource-closures-calendar"] })]);
      toast.success("Fermeture créée");
      setCreating(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Création impossible")),
  });
  const toggle = useMutation({
    mutationFn: (c: ResourceClosureResponse) => resourceService.updateClosureActive(c.id, !c.active, undefined),
    onSuccess: refresh,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  const remove = useMutation({ mutationFn: (id: number) => resourceService.deleteClosure(id), onSuccess: refresh });

  const hasFilters = !!(resourceFilter || activeFilter);
  const change = (fn: () => void) => { fn(); setPage(0); };
  const now = Date.now();

  return (
    <div className="space-y-5">
      <ListHeader
        title="Fermetures"
        subtitle={isLoading ? undefined : `${total} fermeture${total > 1 ? "s" : ""}: maintenance, événements, exceptions`}
        action={<ActionButton icon={Plus} onClick={() => { setError(null); setCreating({ ...EMPTY, resourceCode: resourceFilter }); }}>Nouvelle fermeture</ActionButton>}
      />

      {creating && (
        <PanelForm
          title="Nouvelle fermeture"
          onCancel={() => setCreating(null)}
          pending={create.isPending}
          submitLabel="Créer la fermeture"
          submitDisabled={!creating.resourceCode}
          error={error}
          onSubmit={(e) => {
            e.preventDefault();
            if (!creating.startedAt || !creating.endedAt) return setError("Les dates de début et de fin sont obligatoires.");
            if (new Date(creating.endedAt) <= new Date(creating.startedAt)) return setError("La date de fin doit être postérieure à la date de début.");
            if (creating.recurrence !== "NONE" && !creating.recurrenceUntil) return setError("Indiquez la date de fin de la répétition.");
            setError(null);
            create.mutate();
          }}
        >
          <p className="text-sm text-gray-500">Pendant cette période, la ressource ne peut plus être réservée.</p>
          <Field label="Ressource" required>
            <ResourceAutocomplete selectedCode={creating.resourceCode} onSelect={(r) => setCreating({ ...creating, resourceCode: r?.code || "" })} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Début" required>
              <input type="datetime-local" value={creating.startedAt} onChange={(e) => setCreating({ ...creating, startedAt: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Fin" required>
              <input type="datetime-local" value={creating.endedAt} min={creating.startedAt} onChange={(e) => setCreating({ ...creating, endedAt: e.target.value })} className={FIELD} />
            </Field>
          </div>
          <Field label="Motif">
            <input value={creating.reason} onChange={(e) => setCreating({ ...creating, reason: e.target.value })} placeholder="Ex. Maintenance, événement exceptionnel" className={FIELD} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nature">
              <select value={creating.kind} onChange={(e) => setCreating({ ...creating, kind: e.target.value })} className={FIELD}>
                {Object.entries(KINDS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Répétition">
              <select value={creating.recurrence} onChange={(e) => setCreating({ ...creating, recurrence: e.target.value })} className={FIELD}>
                {Object.entries(RECURRENCES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            {creating.recurrence !== "NONE" && (
              <Field label="Répéter jusqu'au" required>
                <input type="date" value={creating.recurrenceUntil} onChange={(e) => setCreating({ ...creating, recurrenceUntil: e.target.value })} className={FIELD} />
              </Field>
            )}
          </div>
          {creating.resourceCode && creating.startedAt && creating.endedAt && (
            <div className="space-y-2 rounded-2xl bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">Réservations touchées par cette période</p>
              <ImpactedBookingsList resourceCode={creating.resourceCode} from={creating.startedAt.length === 16 ? `${creating.startedAt}:00` : creating.startedAt} to={creating.endedAt.length === 16 ? `${creating.endedAt}:00` : creating.endedAt} />
              <CheckField checked={creating.cancelBookings} onChange={(v) => setCreating({ ...creating, cancelBookings: v })} label="Les annuler et prévenir les clients (sinon la création est refusée s'il y en a)" />
            </div>
          )}
          <CheckField checked={creating.active} onChange={(v) => setCreating({ ...creating, active: v })} label="Fermeture active immédiatement" />
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
        <FilterButton open={showFilters} active={!!activeFilter} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={() => change(() => { setResourceFilter(""); setSelectedResource(null); setActiveFilter(""); })}>
          <Field label="État">
            <select value={activeFilter} onChange={(e) => change(() => setActiveFilter(e.target.value))} className={FIELD}>
              <option value="">Toutes</option>
              <option value="true">Actives</option>
              <option value="false">Inactives</option>
            </select>
          </Field>
        </FilterPanel>
      )}

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les fermetures." onRetry={() => refetch()} />
      ) : closures.length === 0 ? (
        <EmptyState icon={CalendarOff} title="Aucune fermeture" hint={hasFilters ? "Ajustez les filtres." : "Planifiez une fermeture pour bloquer une ressource sur une période."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Ressource</span>
            <span>Période</span>
            <span>Motif</span>
            <span>Durée</span>
            <span>État</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {closures.map((c) => {
              const upcoming = c.active && new Date(c.startedAt).getTime() > now;
              return (
                <div key={c.id} className={`rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
                  <div className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 ${COLS}`}>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold text-gray-900">{c.resourceCode}</p>
                      <p className="text-xs text-gray-400">n° {c.id}</p>
                    </div>
                    <Cell title="Période" className="max-lg:order-3 max-lg:col-span-2">
                      <span className="block text-sm text-gray-800">{formatDateTime(c.startedAt)}</span>
                      <span className="block text-xs text-gray-400">jusqu'au {formatDateTime(c.endedAt)}</span>
                    </Cell>
                    <Cell title="Motif" className="max-lg:order-4 max-lg:col-span-2">
                      <span className="line-clamp-2 text-sm text-gray-600">{c.reason || "Aucun motif"}</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {c.kind && c.kind !== "CLOSURE" && <Tag tone="gray">{KINDS[c.kind] ?? c.kind}</Tag>}
                        {c.recurrence && c.recurrence !== "NONE" && <Tag tone="gray">{RECURRENCES[c.recurrence] ?? c.recurrence}{c.recurrenceUntil ? ` jusqu'au ${c.recurrenceUntil}` : ""}</Tag>}
                      </span>
                    </Cell>
                    <Cell title="Durée" className="max-lg:order-5 max-lg:col-span-2">
                      <Tag tone="gray">{durationLabel(c.startedAt, c.endedAt)}</Tag>
                    </Cell>
                    <div className="flex flex-wrap gap-1.5 max-lg:order-2 max-lg:justify-self-end">
                      <StatusChip tone={c.active ? (upcoming ? "info" : "success") : "neutral"}>{c.active ? (upcoming ? "À venir" : "Active") : "Inactive"}</StatusChip>
                    </div>
                    <div className="flex items-center gap-1 max-lg:order-6 max-lg:col-span-2 lg:justify-end">
                      <IconButton icon={Power} label={c.active ? "Désactiver" : "Activer"} tone={c.active ? "success" : "neutral"} pending={toggle.isPending && toggle.variables?.id === c.id} onClick={() => (c.active ? toggle.mutate(c) : toast.confirm({ message: `Réactiver la fermeture de ${c.resourceCode} ?`, detail: "Si des réservations tombent dans la période, la réactivation est refusée.", confirmLabel: "Réactiver", pendingLabel: "Activation", onConfirm: () => toggle.mutateAsync(c) }))} />
                      <IconButton
                        icon={Trash2}
                        label="Supprimer"
                        tone="danger"
                        onClick={() =>
                          toast.confirm({
                            message: `Supprimer la fermeture de ${c.resourceCode} ?`,
                            detail: "La ressource redevient réservable sur cette période.",
                            confirmLabel: "Supprimer",
                            pendingLabel: "Suppression",
                            successMessage: "Fermeture supprimée",
                            errorMessage: "Suppression impossible",
                            onConfirm: () => remove.mutateAsync(c.id),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={data?.totalPages ?? 1} total={total} noun="fermeture" onChange={setPage} />
        </>
      )}
    </div>
  );
};
