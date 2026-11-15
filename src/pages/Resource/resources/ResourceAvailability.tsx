import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, DoorOpen, Layers, List, Lock, Plus, RefreshCw, Unlock } from "lucide-react";
import { resourceService, SLOT_DURATION_OPTIONS } from "../../../services/resource.service";
import type { ResourceSummaryResponse, SlotDurationMinutes } from "../../../services/resource.service";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, HeadRow, ListHeader, PanelForm, Pagination, Section, StatusChip, Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatDateTime } from "../../../components/subscription/kitUtils";
import { ListSkeleton, Skeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, lastDayOf, usePaged } from "../../../components/resources/resKit";
import { ResourceAutocomplete } from "../../../components/resources/ResourceAutocomplete";
import { BulkAvailabilityModal } from "../../../components/resources/Bulkavailabilitymodal";
import { ResourceAvailabilityCalendar } from "./ResourceAvailabilityCalendar";

type View = "calendar" | "list";
const VIEWS: TabItem<View>[] = [
  { id: "calendar", label: "Calendrier", icon: CalendarDays },
  { id: "list", label: "Liste", icon: List },
];
const COLS = "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_6rem_7rem_6rem_6rem]";

const newGenerate = (resourceCode: string) => ({
  resourceCode,
  startedAt: "",
  endedAt: "",
  capacity: 1,
  active: true,
  // undefined = la durée déjà en vigueur sur la ressource s'applique. Ce n'est un nombre
  // que si l'utilisateur coche explicitement « Changer la durée ».
  slotDurationOverride: undefined as SlotDurationMinutes | undefined,
});

type Capacity = { mode: "reserve" | "release"; slotId: string; quantity: number };

export const ResourceAvailability: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedResource, setSelectedResource] = useState("");
  const [selectedSummary, setSelectedSummary] = useState<ResourceSummaryResponse | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [view, setView] = useState<View>("calendar");
  const [bulk, setBulk] = useState(false);
  const [generate, setGenerate] = useState<ReturnType<typeof newGenerate> | null>(null);
  const [generateInfo, setGenerateInfo] = useState<ResourceSummaryResponse | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [capacityError, setCapacityError] = useState<string | null>(null);

  const from = `${month}-01T00:00:00`;
  const to = `${lastDayOf(month)}T23:59:59`;

  const slotsQuery = useQuery({
    queryKey: ["resource-availabilities", selectedResource, month],
    queryFn: () => resourceService.getAvailabilities({ resourceCode: selectedResource, from, to, size: 500, sort: "startedAt,asc" }),
    enabled: !!selectedResource,
  });
  const slots = useMemo(() => slotsQuery.data?.content ?? [], [slotsQuery.data]);

  const closuresQuery = useQuery({
    queryKey: ["resource-closures-calendar", selectedResource, month],
    queryFn: () => resourceService.getClosures({ resourceCode: selectedResource, from: `${month}-01`, to: lastDayOf(month), size: 200 }),
    enabled: !!selectedResource,
  });
  const closures = closuresQuery.data?.content ?? [];

  const remainingQuery = useQuery({
    queryKey: ["resource-availabilities-remaining", selectedResource, month],
    queryFn: () => resourceService.searchRemainingSlots({ resourceCode: selectedResource, from, to }),
    enabled: !!selectedResource,
  });
  const windows = remainingQuery.data ?? [];

  const paged = usePaged(slots, 15);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["resource-availabilities"] }),
      queryClient.invalidateQueries({ queryKey: ["resource-availabilities-remaining"] }),
      queryClient.invalidateQueries({ queryKey: ["resource-availability-grouped"] }),
    ]);

  const create = useMutation({
    mutationFn: () =>
      resourceService.createAvailability({
        resourceCode: generate!.resourceCode,
        startedAt: generate!.startedAt,
        endedAt: generate!.endedAt,
        slotDurationMinutes: generate!.slotDurationOverride,
        totalCapacity: generate!.capacity,
        active: generate!.active,
      }),
    onSuccess: async () => {
      await refresh();
      toast.success("Créneaux générés");
      setGenerate(null);
      setGenerateError(null);
    },
    onError: (e) => setGenerateError(apiMessage(e, "Génération des créneaux impossible")),
  });

  const adjustCapacity = useMutation({
    mutationFn: () => {
      const id = Number(capacity!.slotId);
      return capacity!.mode === "reserve" ? resourceService.reserveAvailabilitySlot(id, capacity!.quantity) : resourceService.releaseAvailabilitySlot(id, capacity!.quantity);
    },
    onSuccess: async () => {
      await refresh();
      toast.success(capacity?.mode === "reserve" ? "Capacité réservée" : "Capacité libérée");
      setCapacity(null);
      setCapacityError(null);
    },
    onError: (e) => setCapacityError(apiMessage(e, capacity?.mode === "reserve" ? "Réservation impossible" : "Libération impossible")),
  });

  const openGenerate = () => {
    setGenerateError(null);
    setGenerateInfo(selectedSummary);
    setGenerate(newGenerate(selectedResource));
  };
  const slotLabel = (s: (typeof slots)[number]) => `${formatDateTime(s.startedAt)} à ${s.endedAt.slice(11, 16)}, ${s.remainingCapacity}/${s.totalCapacity} places`;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Disponibilités"
        subtitle="Ouvrez des créneaux réservables, par ressource ou sur plusieurs ressources à la fois."
        action={
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="ghost" icon={Layers} onClick={() => setBulk(true)}>Plusieurs ressources</ActionButton>
            <ActionButton icon={Plus} onClick={openGenerate}>Générer des créneaux</ActionButton>
          </div>
        }
      />

      <BulkAvailabilityModal isOpen={bulk} onClose={() => setBulk(false)} />

      {generate && (
        <PanelForm
          title="Générer des créneaux de disponibilité"
          onCancel={() => setGenerate(null)}
          pending={create.isPending}
          submitLabel="Générer"
          submitDisabled={!generate.resourceCode}
          error={generateError}
          onSubmit={(e) => {
            e.preventDefault();
            if (!generate.startedAt || !generate.endedAt) return setGenerateError("Les dates de début et de fin sont obligatoires.");
            if (new Date(generate.endedAt) <= new Date(generate.startedAt)) return setGenerateError("La date de fin doit être postérieure à la date de début.");
            setGenerateError(null);
            create.mutate();
          }}
        >
          <Field label="Ressource" required>
            <ResourceAutocomplete
              selectedResource={generateInfo}
              selectedCode={generate.resourceCode}
              onSelect={(r) => {
                setGenerateInfo(r);
                setGenerate({ ...generate, resourceCode: r?.code || "", slotDurationOverride: undefined });
              }}
              required
            />
          </Field>
          <p className="text-sm text-gray-500">
            {generateInfo?.slotDurationMinutes
              ? `Cette ressource fonctionne actuellement par tranches de ${generateInfo.slotDurationMinutes} min.`
              : "Aucune durée particulière configurée: 30 min par défaut."}
          </p>
          <CheckField
            checked={generate.slotDurationOverride !== undefined}
            onChange={(v) => setGenerate({ ...generate, slotDurationOverride: v ? ((generateInfo?.slotDurationMinutes ?? 30) as SlotDurationMinutes) : undefined })}
            label="Changer la durée pour ce lot de créneaux"
          />
          {generate.slotDurationOverride !== undefined && (
            <Field label="Durée des créneaux" hint="Refusé si la ressource a déjà des créneaux futurs à une autre durée: il faudra d'abord les supprimer.">
              <select value={generate.slotDurationOverride} onChange={(e) => setGenerate({ ...generate, slotDurationOverride: Number(e.target.value) as SlotDurationMinutes })} className={`${FIELD} sm:max-w-[12rem]`}>
                {SLOT_DURATION_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Début" required>
              <input type="datetime-local" value={generate.startedAt} onChange={(e) => setGenerate({ ...generate, startedAt: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Fin" required>
              <input type="datetime-local" value={generate.endedAt} min={generate.startedAt} onChange={(e) => setGenerate({ ...generate, endedAt: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Capacité par créneau" hint="Les créneaux sont découpés par le serveur.">
              <input type="number" min={1} value={generate.capacity} onChange={(e) => setGenerate({ ...generate, capacity: parseInt(e.target.value) || 1 })} className={FIELD} />
            </Field>
          </div>
          <CheckField checked={generate.active} onChange={(v) => setGenerate({ ...generate, active: v })} label="Actif immédiatement" />
        </PanelForm>
      )}

      <ResourceAutocomplete
        selectedResource={selectedSummary}
        selectedCode={selectedResource}
        onSelect={(r) => {
          setSelectedSummary(r);
          setSelectedResource(r?.code || "");
          setCapacity(null);
        }}
        placeholder="Choisir la ressource à afficher"
      />

      {!selectedResource ? (
        <EmptyState icon={DoorOpen} title="Choisissez une ressource" hint="Ses créneaux, ses fermetures et ses fenêtres libres s'afficheront ici." />
      ) : (
        <>
          {capacity && (
            <PanelForm
              title={capacity.mode === "reserve" ? "Réserver de la capacité" : "Libérer de la capacité"}
              onCancel={() => setCapacity(null)}
              pending={adjustCapacity.isPending}
              submitLabel={capacity.mode === "reserve" ? "Réserver" : "Libérer"}
              submitDisabled={!capacity.slotId}
              error={capacityError}
              onSubmit={(e) => { e.preventDefault(); setCapacityError(null); adjustCapacity.mutate(); }}
            >
              <Field label="Créneau" required hint={slots.length === 0 ? "Aucun créneau sur ce mois." : undefined}>
                <select value={capacity.slotId} onChange={(e) => setCapacity({ ...capacity, slotId: e.target.value })} className={FIELD}>
                  <option value="">Choisir un créneau</option>
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>{slotLabel(s)}</option>
                  ))}
                </select>
              </Field>
              <Field label={capacity.mode === "reserve" ? "Quantité à réserver" : "Quantité à libérer"} required>
                <input type="number" min={1} value={capacity.quantity} onChange={(e) => setCapacity({ ...capacity, quantity: parseInt(e.target.value) || 1 })} className={`${FIELD} sm:max-w-[10rem]`} />
              </Field>
            </PanelForm>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs items={VIEWS} active={view} onChange={setView} variant="soft" />
            <div className="flex flex-wrap gap-2">
              <ActionButton variant="ghost" icon={Lock} onClick={() => { setCapacityError(null); setCapacity({ mode: "reserve", slotId: "", quantity: 1 }); }}>Réserver</ActionButton>
              <ActionButton variant="ghost" icon={Unlock} onClick={() => { setCapacityError(null); setCapacity({ mode: "release", slotId: "", quantity: 1 }); }}>Libérer</ActionButton>
            </div>
          </div>

          {slotsQuery.isError ? (
            <ErrorBlock message="Impossible de charger les créneaux." onRetry={() => slotsQuery.refetch()} />
          ) : view === "calendar" ? (
            <Section title={selectedSummary?.name || selectedResource} icon={CalendarDays}>
              <div className={slotsQuery.isLoading ? "pointer-events-none opacity-60" : ""}>
                <ResourceAvailabilityCalendar month={month} onMonthChange={setMonth} slots={slots} closures={closures} />
              </div>
            </Section>
          ) : slotsQuery.isLoading ? (
            <ListSkeleton rows={6} />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Mois affiché" className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-[color:var(--logo-pink)]" />
                <span className="text-sm text-gray-500">{slots.length} créneau{slots.length > 1 ? "x" : ""}</span>
              </div>
              {slots.length === 0 ? (
                <EmptyState icon={CalendarDays} title="Aucun créneau ce mois-ci" hint="Générez des créneaux pour ouvrir cette ressource à la réservation." />
              ) : (
                <>
                  <HeadRow cols={COLS}>
                    <span>Début</span>
                    <span>Fin</span>
                    <span>Durée</span>
                    <span>Places</span>
                    <span>Disponible</span>
                    <span>Actif</span>
                  </HeadRow>
                  <DataCard>
                    {paged.slice.map((s) => (
                      <div key={s.id} className={`rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
                        <div className={`grid grid-cols-2 items-center gap-x-4 gap-y-2 p-4 ${COLS}`}>
                          <Cell title="Début"><span className="text-sm font-semibold text-gray-900">{formatDateTime(s.startedAt)}</span></Cell>
                          <Cell title="Fin"><span className="text-sm text-gray-700">{formatDateTime(s.endedAt)}</span></Cell>
                          <Cell title="Durée"><span className="text-sm text-gray-700">{s.slotDurationMinutes} min</span></Cell>
                          <Cell title="Places"><span className="text-sm text-gray-700">{s.remainingCapacity} / {s.totalCapacity}</span></Cell>
                          <Cell title="Disponible"><StatusChip tone={s.available ? "success" : "danger"}>{s.available ? "Oui" : "Non"}</StatusChip></Cell>
                          <Cell title="Actif"><StatusChip tone={s.active ? "success" : "neutral"}>{s.active ? "Oui" : "Non"}</StatusChip></Cell>
                        </div>
                      </div>
                    ))}
                  </DataCard>
                  <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} noun="créneau" onChange={paged.setPage} />
                </>
              )}
            </>
          )}

          <Section
            title="Fenêtres libres restantes"
            description="Plages encore réservables sur le mois affiché."
            action={
              <button type="button" onClick={() => remainingQuery.refetch()} disabled={remainingQuery.isFetching} aria-label="Actualiser" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 disabled:opacity-50">
                <RefreshCw size={15} className={remainingQuery.isFetching ? "animate-spin" : ""} />
              </button>
            }
          >
            {remainingQuery.isLoading ? (
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-14 w-52" />
                <Skeleton className="h-14 w-52" />
              </div>
            ) : windows.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune fenêtre libre sur ce mois.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {windows.map((w, i) => (
                  <div key={i} className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm">
                    <p className="flex items-center gap-1.5 font-semibold text-gray-900">
                      {formatDateTime(w.startedAt)} <ArrowRight size={12} className="text-gray-400" /> {formatDateTime(w.endedAt)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {w.slotCount} créneau{w.slotCount > 1 ? "x" : ""}, {w.durationMinutes} min, {w.remainingCapacity} place{w.remainingCapacity > 1 ? "s" : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
};
