import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, CalendarDays, DoorOpen, Lock, Plus, RefreshCw, Search, Unlock } from "lucide-react";
import { resourceService, SLOT_DURATION_OPTIONS } from "../../../services/resource.service";
import type { AdminCalendarSlot, ResourceBookingUnit, ResourceSummaryResponse, SlotDurationMinutes } from "../../../services/resource.service";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, ListHeader, PanelForm, Pagination, Section } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDateTime, formatMoney } from "../../../components/subscription/kitUtils";
import { Skeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { ResourceAutocomplete } from "../../../components/resources/ResourceAutocomplete";
import { ChartCard, ChartSkeleton, ColumnChart, DonutBreakdown, KpiRow, KpiRowSkeleton, BarBreakdown, NoData } from "../../../components/operations/OpsCharts";
import type { Slice } from "../../../components/operations/opsChartData";
import { UNIT_LABEL, UNITS, lastDayOf, usePaged } from "../../../components/resources/resKit";

const LEVELS: { key: string; label: string; color: string }[] = [
  { key: "FREE", label: "Libre", color: "#16a34a" },
  { key: "PARTIALLY_OCCUPIED", label: "Partiel", color: "#eab308" },
  { key: "HIGHLY_OCCUPIED", label: "Très occupé", color: "#f97316" },
  { key: "FULL", label: "Complet", color: "#dc2626" },
];
const PINK = "#e6007e";

type Op = { mode: "reserve" | "release"; slotId: string; quantity: number };

export const ResourcePlanningAdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState<ResourceSummaryResponse | null>(null);
  const [resourceCode, setResourceCode] = useState("");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const [gen, setGen] = useState<{ startedAt: string; endedAt: string; capacity: number; active: boolean; duration?: SlotDurationMinutes } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState({ from: "", to: "", durationMinutes: 60 });
  const [quote, setQuote] = useState({ bookingUnit: "HOUR" as ResourceBookingUnit, startedAt: "", endedAt: "" });

  const fromDate = `${month}-01`;
  const toDate = lastDayOf(month);

  const adminQuery = useQuery({
    queryKey: ["resource-admin-calendar", resourceCode, month],
    queryFn: () => resourceService.getAdminCalendar(resourceCode, { fromDate, toDate }),
    enabled: !!resourceCode,
  });
  const publicQuery = useQuery({
    queryKey: ["resource-public-calendar", resourceCode, month],
    queryFn: () => resourceService.getPublicCalendar(resourceCode, { fromDate, toDate }),
    enabled: !!resourceCode,
  });
  const occupiedQuery = useQuery({
    queryKey: ["resource-occupied-slots", resourceCode, month],
    queryFn: () => resourceService.getOccupiedSlots({ resourceCode: resourceCode || undefined, from: `${fromDate}T00:00:00`, to: `${toDate}T23:59:59`, size: 200 }),
    enabled: !!resourceCode,
  });
  const groupedQuery = useQuery({
    queryKey: ["resource-availability-grouped", month],
    queryFn: () => resourceService.getAvailabilitiesGrouped({ from: `${fromDate}T00:00:00`, to: `${toDate}T23:59:59`, active: true }),
  });
  // Créneaux réels (avec identifiant) pour choisir quoi réserver ou libérer
  const slotsQuery = useQuery({
    queryKey: ["resource-availabilities", resourceCode, month],
    queryFn: () => resourceService.getAvailabilities({ resourceCode, from: `${fromDate}T00:00:00`, to: `${toDate}T23:59:59`, size: 500, sort: "startedAt,asc" }),
    enabled: !!resourceCode,
  });
  const remainingQuery = useQuery({
    queryKey: ["resource-remaining-slots", resourceCode, remaining.from, remaining.to, remaining.durationMinutes],
    queryFn: () => resourceService.searchRemainingSlots({ resourceCode, from: remaining.from, to: remaining.to, durationMinutes: remaining.durationMinutes }),
    enabled: false,
  });
  const quoteQuery = useQuery({
    queryKey: ["resource-price-quote", resourceCode, quote],
    queryFn: () => resourceService.quotePrice({ resourceCode, bookingUnit: quote.bookingUnit, startedAt: quote.startedAt, endedAt: quote.endedAt }),
    enabled: false,
  });

  const adminSlots: AdminCalendarSlot[] = useMemo(() => {
    const data: any = adminQuery.data;
    if (Array.isArray(data?.slots)) return data.slots;
    if (Array.isArray(data?.days)) return data.days.flatMap((d: any) => d.slots || []);
    return [];
  }, [adminQuery.data]);
  const days = publicQuery.data?.days || [];
  const occupied: any[] = occupiedQuery.data?.content || [];
  const grouped = groupedQuery.data || [];
  const slots = slotsQuery.data?.content ?? [];
  const occPaged = usePaged(occupied, 8);

  const stats = useMemo(() => {
    const totalCap = adminSlots.reduce((a, s) => a + s.totalCapacity, 0);
    const left = adminSlots.reduce((a, s) => a + s.remainingCapacity, 0);
    return { totalCap, left, booked: totalCap - left, rate: totalCap > 0 ? Math.round(((totalCap - left) / totalCap) * 100) : 0 };
  }, [adminSlots]);

  const levelSlices: Slice[] = LEVELS.map((l) => ({
    ...l,
    value: adminSlots.filter((s) => (s.occupancyLevel || (s.available ? "FREE" : "FULL")) === l.key).length,
  })).filter((s) => s.value > 0);

  const perDay: Slice[] = days.map((d) => ({
    key: d.date,
    label: [1, 5, 10, 15, 20, 25, 30].includes(new Date(d.date).getDate()) ? String(new Date(d.date).getDate()) : "",
    value: d.totalCapacity - d.remainingCapacity,
    color: PINK,
  }));

  const groupSlices: Slice[] = grouped
    .map((g) => ({ key: g.resourceCode, label: g.resourceName, value: g.availabilities.length, color: PINK }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const refreshAll = () =>
    Promise.all(
      ["resource-admin-calendar", "resource-public-calendar", "resource-occupied-slots", "resource-availability-grouped", "resource-availabilities", "resource-availabilities-remaining"].map((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      ),
    );

  const create = useMutation({
    mutationFn: () =>
      resourceService.createAvailability({ resourceCode, startedAt: gen!.startedAt, endedAt: gen!.endedAt, slotDurationMinutes: gen!.duration, totalCapacity: gen!.capacity || 1, active: gen!.active }),
    onSuccess: async () => { await refreshAll(); toast.success("Créneaux générés"); setGen(null); },
    onError: (e) => setGenError(apiMessage(e, "Génération impossible")),
  });
  const adjust = useMutation({
    mutationFn: () => {
      const id = Number(op!.slotId);
      return op!.mode === "reserve" ? resourceService.reserveAvailabilitySlot(id, op!.quantity || 1) : resourceService.releaseAvailabilitySlot(id, op!.quantity || 1);
    },
    onSuccess: async () => { await refreshAll(); toast.success(op?.mode === "reserve" ? "Capacité réservée" : "Capacité libérée"); setOp(null); },
    onError: (e) => setOpError(apiMessage(e, "Opération impossible")),
  });

  const pick = (r: ResourceSummaryResponse | null) => {
    setSummary(r);
    setResourceCode(r?.code || "");
    setGen(null);
    setOp(null);
    setRemaining({ from: `${fromDate}T08:00`, to: `${toDate}T18:00`, durationMinutes: 60 });
    setQuote({ bookingUnit: "HOUR", startedAt: `${fromDate}T08:00`, endedAt: `${fromDate}T09:00` });
  };
  const loading = adminQuery.isLoading || publicQuery.isLoading;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Planning"
        subtitle="Occupation, réservations et créneaux restants d'une ressource."
        action={
          <ActionButton icon={Plus} onClick={() => { if (!resourceCode) return toast.error("Choisissez d'abord une ressource"); setGenError(null); setGen({ startedAt: "", endedAt: "", capacity: 1, active: true }); }}>
            Générer des créneaux
          </ActionButton>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <ResourceAutocomplete selectedResource={summary} selectedCode={resourceCode} onSelect={pick} placeholder="Choisir une ressource" />
        </div>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Mois" className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-[color:var(--logo-pink)]" />
        <button type="button" disabled={!resourceCode} onClick={refreshAll} aria-label="Actualiser" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 disabled:opacity-40">
          <RefreshCw size={16} />
        </button>
      </div>

      {gen && (
        <PanelForm
          title="Générer des créneaux"
          onCancel={() => setGen(null)}
          pending={create.isPending}
          submitLabel="Générer"
          error={genError}
          onSubmit={(e) => {
            e.preventDefault();
            if (!gen.startedAt || !gen.endedAt) return setGenError("Les dates sont obligatoires.");
            if (new Date(gen.endedAt) <= new Date(gen.startedAt)) return setGenError("La fin doit être après le début.");
            setGenError(null);
            create.mutate();
          }}
        >
          <p className="text-sm text-gray-500">
            {summary?.slotDurationMinutes ? `Cette ressource fonctionne par tranches de ${summary.slotDurationMinutes} min.` : "Durée par défaut de la ressource (30 min si non configurée)."}
          </p>
          <CheckField checked={gen.duration !== undefined} onChange={(v) => setGen({ ...gen, duration: v ? ((summary?.slotDurationMinutes ?? 30) as SlotDurationMinutes) : undefined })} label="Changer la durée pour ce lot" />
          {gen.duration !== undefined && (
            <select value={gen.duration} onChange={(e) => setGen({ ...gen, duration: Number(e.target.value) as SlotDurationMinutes })} className={`${FIELD} sm:max-w-[12rem]`}>
              {SLOT_DURATION_OPTIONS.map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Début" required><input type="datetime-local" value={gen.startedAt} onChange={(e) => setGen({ ...gen, startedAt: e.target.value })} className={FIELD} /></Field>
            <Field label="Fin" required><input type="datetime-local" value={gen.endedAt} min={gen.startedAt} onChange={(e) => setGen({ ...gen, endedAt: e.target.value })} className={FIELD} /></Field>
            <Field label="Capacité"><input type="number" min={1} value={gen.capacity} onChange={(e) => setGen({ ...gen, capacity: parseInt(e.target.value) || 1 })} className={FIELD} /></Field>
          </div>
          <CheckField checked={gen.active} onChange={(v) => setGen({ ...gen, active: v })} label="Actif immédiatement" />
        </PanelForm>
      )}

      {!resourceCode ? (
        <>
          <EmptyState icon={DoorOpen} title="Choisissez une ressource" hint="Son planning complet s'affichera ici." />
          <GroupedBlock loading={groupedQuery.isLoading} slices={groupSlices} />
        </>
      ) : adminQuery.isError ? (
        <ErrorBlock message="Impossible de charger le planning." onRetry={() => adminQuery.refetch()} />
      ) : (
        <>
          {loading ? (
            <KpiRowSkeleton />
          ) : (
            <KpiRow
              items={[
                { label: "Taux d'occupation", value: `${stats.rate} %`, tone: "pink" },
                { label: "Créneaux", value: adminSlots.length },
                { label: "Places restantes", value: stats.left, tone: "success" },
                { label: "Réservations", value: occupied.length },
              ]}
            />
          )}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            {loading ? <ChartSkeleton /> : (
              <ChartCard title="Places réservées par jour" subtitle={summary?.name || resourceCode}>
                {perDay.length === 0 ? <NoData text="Aucun créneau sur ce mois." /> : <ColumnChart data={perDay} />}
              </ChartCard>
            )}
            {loading ? <ChartSkeleton /> : (
              <ChartCard title="Niveau d'occupation" subtitle="Répartition des créneaux">
                <DonutBreakdown data={levelSlices} centerLabel="créneaux" />
              </ChartCard>
            )}
          </div>

          {op && (
            <PanelForm
              title={op.mode === "reserve" ? "Réserver de la capacité" : "Libérer de la capacité"}
              onCancel={() => setOp(null)}
              pending={adjust.isPending}
              submitLabel={op.mode === "reserve" ? "Réserver" : "Libérer"}
              submitDisabled={!op.slotId}
              error={opError}
              onSubmit={(e) => { e.preventDefault(); setOpError(null); adjust.mutate(); }}
            >
              <Field label="Créneau" required hint={slots.length === 0 ? "Aucun créneau sur ce mois." : undefined}>
                <select value={op.slotId} onChange={(e) => setOp({ ...op, slotId: e.target.value })} className={FIELD}>
                  <option value="">Choisir un créneau</option>
                  {slots.map((s) => <option key={s.id} value={s.id}>{formatDateTime(s.startedAt)}, {s.remainingCapacity}/{s.totalCapacity} places</option>)}
                </select>
              </Field>
              <Field label="Quantité" required>
                <input type="number" min={1} value={op.quantity} onChange={(e) => setOp({ ...op, quantity: parseInt(e.target.value) || 1 })} className={`${FIELD} sm:max-w-[10rem]`} />
              </Field>
            </PanelForm>
          )}

          <div className="flex flex-wrap gap-2">
            <ActionButton variant="ghost" icon={Lock} onClick={() => { setOpError(null); setOp({ mode: "reserve", slotId: "", quantity: 1 }); }}>Réserver</ActionButton>
            <ActionButton variant="ghost" icon={Unlock} onClick={() => { setOpError(null); setOp({ mode: "release", slotId: "", quantity: 1 }); }}>Libérer</ActionButton>
          </div>

          <Section title="Réservations du mois" icon={CalendarDays}>
            {occupiedQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : occupied.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun créneau occupé.</p>
            ) : (
              <>
                <DataCard>
                  {occPaged.slice.map((s, i) => (
                    <div key={`${s.bookingCode || i}-${s.startedAt}`} className="flex items-center justify-between gap-3 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{s.customerName || s.memberName || s.bookingCode || "Occupation"}</p>
                        <p className="text-xs text-gray-500">{formatDateTime(s.startedAt)} à {String(s.endedAt || "").slice(11, 16)}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">Qté {s.quantity || 1}</span>
                    </div>
                  ))}
                </DataCard>
                <Pagination page={occPaged.page} totalPages={occPaged.totalPages} total={occPaged.total} noun="réservation" onChange={occPaged.setPage} />
              </>
            )}
          </Section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Fenêtres libres" description="Cherchez une plage pour une durée donnée." icon={Search}>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_6rem]">
                <input type="datetime-local" value={remaining.from} onChange={(e) => setRemaining({ ...remaining, from: e.target.value })} className={FIELD} aria-label="Début" />
                <input type="datetime-local" value={remaining.to} onChange={(e) => setRemaining({ ...remaining, to: e.target.value })} className={FIELD} aria-label="Fin" />
                <input type="number" min={5} value={remaining.durationMinutes} onChange={(e) => setRemaining({ ...remaining, durationMinutes: parseInt(e.target.value) || 60 })} className={FIELD} aria-label="Durée en minutes" />
              </div>
              <div className="mt-3">
                <ActionButton variant="ghost" icon={Search} pending={remainingQuery.isFetching} disabled={!remaining.from || !remaining.to} onClick={() => remainingQuery.refetch()}>Rechercher</ActionButton>
              </div>
              <div className="mt-4 space-y-2">
                {(remainingQuery.data || []).map((w, i) => (
                  <div key={i} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm">
                    <p className="font-semibold text-gray-900">{formatDateTime(w.startedAt)} à {formatDateTime(w.endedAt)}</p>
                    <p className="text-xs text-gray-500">{w.durationMinutes} min, {w.remainingCapacity} place{w.remainingCapacity > 1 ? "s" : ""}, {w.slotCount} créneau{w.slotCount > 1 ? "x" : ""}</p>
                  </div>
                ))}
                {remainingQuery.isFetched && (remainingQuery.data || []).length === 0 && <p className="text-sm text-gray-500">Aucune fenêtre libre.</p>}
              </div>
            </Section>

            <Section title="Devis tarifaire" description="Prix d'une période selon les règles en vigueur." icon={Calculator}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Unité">
                  <select value={quote.bookingUnit} onChange={(e) => setQuote({ ...quote, bookingUnit: e.target.value as ResourceBookingUnit })} className={FIELD}>
                    {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u] ?? u}</option>)}
                  </select>
                </Field>
                <span className="hidden sm:block" />
                <Field label="Début"><input type="datetime-local" value={quote.startedAt} onChange={(e) => setQuote({ ...quote, startedAt: e.target.value })} className={FIELD} /></Field>
                <Field label="Fin"><input type="datetime-local" value={quote.endedAt} onChange={(e) => setQuote({ ...quote, endedAt: e.target.value })} className={FIELD} /></Field>
              </div>
              <div className="mt-3">
                <ActionButton variant="ghost" icon={Calculator} pending={quoteQuery.isFetching} disabled={!quote.startedAt || !quote.endedAt} onClick={() => quoteQuery.refetch()}>Calculer</ActionButton>
              </div>
              {quoteQuery.data && (
                <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <p className="text-3xl font-bold text-gray-950">{formatMoney(quoteQuery.data.finalPrice, "FCFA")}</p>
                  <p className="text-sm text-gray-500">base {formatMoney(quoteQuery.data.basePrice, "FCFA")}{quoteQuery.data.appliedRuleId ? `, règle n° ${quoteQuery.data.appliedRuleId}` : ""}</p>
                </div>
              )}
            </Section>
          </div>

          <GroupedBlock loading={groupedQuery.isLoading} slices={groupSlices} />
        </>
      )}
    </div>
  );
};

const GroupedBlock: React.FC<{ loading: boolean; slices: Slice[] }> = ({ loading, slices }) =>
  loading ? (
    <ChartSkeleton />
  ) : (
    <ChartCard title="Créneaux ouverts par ressource" subtitle="Les ressources les plus ouvertes sur le mois">
      <BarBreakdown data={slices} />
    </ChartCard>
  );
