import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, CalendarDays, Coffee, DoorClosed, DollarSign, Pencil, Plus, Settings, Unlink } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type { ResourceBookingUnit, ResourcePricingRuleResponse } from "../../../services/resource.service";
import { ActionButton, CheckField, Detail, EmptyState, ErrorBlock, Field, IconButton, PageHeader, PanelForm, Pagination, Section, Switch, Tabs, Tag } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { FIELD, FIELD_SOFT, apiMessage, formatDateTime, formatMoney } from "../../../components/subscription/kitUtils";
import { DetailsSkeleton, ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { DetailShell, Row, STATUSES, STATUS_LABEL, StatusBadge, UNITS, UNIT_LABEL, dayLabel, hhmm } from "../../../components/resources/resKit";
import { ResourceFields, resourceError, resourceToForm } from "../../../components/resources/ResourceFields";
import type { ResourceForm } from "../../../components/resources/ResourceFields";
import { ResourceAvailabilityCalendar } from "./ResourceAvailabilityCalendar";

type Tab = "info" | "amenities" | "pricing" | "availability" | "calendar";
const TABS: TabItem<Tab>[] = [
  { id: "info", label: "Informations", icon: Settings },
  { id: "amenities", label: "Équipements", icon: Coffee },
  { id: "pricing", label: "Tarifs", icon: DollarSign },
  { id: "availability", label: "Disponibilités", icon: CalendarDays },
  { id: "calendar", label: "Calendrier", icon: CalendarDays },
];
const AV_SIZE = 10;

export const ResourceDetailPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("info");
  const [visited, setVisited] = useState<Set<Tab>>(new Set(["info"]));
  const [form, setForm] = useState<ResourceForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState<{ amenityCode: string; quantity: number; optional: boolean; extraPrice: number } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [quote, setQuote] = useState<{ bookingUnit: ResourceBookingUnit; startedAt: string; endedAt: string }>({ bookingUnit: "HOUR", startedAt: "", endedAt: "" });
  const [avPage, setAvPage] = useState(0);
  const [calMonth, setCalMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const open = (t: Tab) => {
    setTab(t);
    setVisited((v) => new Set([...v, t]));
  };
  const seen = (t: Tab) => visited.has(t);
  const editing = form !== null;

  const { data: resource, isLoading, isError } = useQuery({ queryKey: ["resource", code], queryFn: () => resourceService.getResource(code!), enabled: !!code });
  const typesQuery = useQuery({ queryKey: ["resource-types-list"], queryFn: () => resourceService.getResourceTypes({ size: 500 }), enabled: editing });
  const groupsQuery = useQuery({ queryKey: ["resource-groups-list"], queryFn: () => resourceService.getResourceGroups({ size: 500 }), enabled: editing });
  const policiesQuery = useQuery({ queryKey: ["resource-policies-list"], queryFn: () => resourceService.getResourcePolicies({ size: 500 }), enabled: editing });

  const amenitiesQuery = useQuery({ queryKey: ["resource-amenities", code], queryFn: () => resourceService.getResourceAmenities(code!), enabled: !!code && seen("amenities") });
  const allAmenities = useQuery({ queryKey: ["all-amenities"], queryFn: () => resourceService.getAmenities({ size: 500 }), enabled: !!linking });
  const pricingQuery = useQuery({ queryKey: ["resource-pricing", code], queryFn: () => resourceService.getPricingRules({ resourceCode: code!, size: 100 }), enabled: !!code && seen("pricing") });
  const availQuery = useQuery({
    queryKey: ["resource-availabilities", code, "detail", avPage],
    queryFn: () => resourceService.getAvailabilities({ resourceCode: code!, page: avPage, size: AV_SIZE, sort: "startedAt,asc" }),
    enabled: !!code && seen("availability"),
  });
  const calendarQuery = useQuery({
    queryKey: ["resource-calendar", code, calMonth],
    queryFn: () => {
      const [year, month] = calMonth.split("-");
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      return resourceService.getPublicCalendar(code!, { fromDate: `${calMonth}-01`, toDate: `${calMonth}-${String(lastDay).padStart(2, "0")}` });
    },
    enabled: !!code && seen("calendar"),
  });

  const refresh = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: ["resources"] }), queryClient.invalidateQueries({ queryKey: ["resource", code] })]);

  const save = useMutation({
    mutationFn: async () => {
      const f = form!;
      await resourceService.updateResource(code!, {
        name: f.name.trim(),
        description: f.description.trim() || undefined,
        capacity: f.capacity,
        zone: f.zone.trim() || undefined,
        locationLabel: f.locationLabel.trim() || undefined,
        bookingEnabled: f.bookingEnabled,
        portalVisible: f.portalVisible,
      });
      // Le formulaire est pré-rempli : on ne touche à la classification que si elle a changé
      const r = resource!;
      if (f.typeCode !== (r.typeCode ?? "") || f.groupCode !== (r.groupCode ?? "") || f.policyCode !== (r.policyCode ?? "")) {
        await resourceService.updateResourceClassification(code!, { typeId: f.typeCode, groupId: f.groupCode || undefined, policyId: f.policyCode || undefined });
      }
      if (f.status !== r.status) await resourceService.updateResourceStatus(code!, f.status);
      if (f.active !== r.active) await resourceService.updateResourceActive(code!, f.active);
      if (f.displayOrder !== (r.displayOrder ?? 0)) await resourceService.updateResourceDisplayOrder(code!, f.displayOrder);
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Ressource modifiée");
      setForm(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Modification impossible")),
  });
  const useQuick = <V,>(fn: (v: V) => Promise<unknown>, fail: string) =>
    useMutation({ mutationFn: fn, onSuccess: refresh, onError: (e) => toast.error(apiMessage(e, fail)) });
  const setStatus = useQuick((s: string) => resourceService.updateResourceStatus(code!, s as never), "Changement de statut impossible");
  const setBooking = useQuick((v: boolean) => resourceService.updateResourceBookingEnabled(code!, v), "Modification impossible");
  const setPortal = useQuick((v: boolean) => resourceService.updateResourcePortalVisible(code!, v), "Modification impossible");
  const setActive = useQuick((v: boolean) => resourceService.updateResourceActive(code!, v), "Modification impossible");

  const link = useMutation({
    mutationFn: () => resourceService.linkAmenity(code!, linking!.amenityCode, { quantity: linking!.quantity, optional: linking!.optional, extraPrice: linking!.extraPrice }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["resource-amenities", code] });
      toast.success("Équipement associé");
      setLinking(null);
      setLinkError(null);
    },
    onError: (e) => setLinkError(apiMessage(e, "Association impossible")),
  });
  const unlink = useMutation({
    mutationFn: (amenityCode: string) => resourceService.unlinkAmenity(code!, amenityCode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resource-amenities", code] }),
  });
  const quoteMutation = useMutation({
    mutationFn: () => resourceService.quotePrice({ resourceCode: code!, bookingUnit: quote.bookingUnit, startedAt: quote.startedAt, endedAt: quote.endedAt }),
  });

  const back = () => navigate("/resources");
  if (isLoading) return <DetailShell><DetailsSkeleton /></DetailShell>;
  if (isError || !resource) {
    return (
      <DetailShell>
        <EmptyState icon={DoorClosed} title="Ressource introuvable" hint="Elle a peut-être été supprimée." action={<ActionButton onClick={back}>Retour aux ressources</ActionButton>} />
      </DetailShell>
    );
  }

  const linked = amenitiesQuery.data ?? [];
  const rules: ResourcePricingRuleResponse[] = pricingQuery.data?.content ?? [];
  const quoteResult = quoteMutation.data;
  const hidden = (t: Tab) => (tab === t ? "" : "hidden");
  const quoteReady = quote.startedAt && quote.endedAt && quote.endedAt > quote.startedAt;

  return (
    <DetailShell>
      <PageHeader
        title={resource.name}
        subtitle={<span className="font-mono">{resource.code}</span>}
        onBack={back}
        backLabel="Retour aux ressources"
        badge={<StatusBadge status={String(resource.status)} />}
        actions={!editing && <ActionButton icon={Pencil} onClick={() => { setError(null); setForm(resourceToForm(resource)); open("info"); }}>Modifier</ActionButton>}
      />

      {!editing && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <Switch checked={resource.bookingEnabled} onChange={(v) => setBooking.mutate(v)} label="Réservations ouvertes" hint="Fermées, plus aucune réservation n'est possible." />
          <Switch checked={resource.portalVisible} onChange={(v) => setPortal.mutate(v)} label="Visible sur le portail" hint="Masquée, elle n'apparaît plus côté client." />
          <Switch checked={resource.active} onChange={(v) => setActive.mutate(v)} label="Ressource active" />
          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <label className="block text-xs font-semibold text-gray-500">
              Statut rapide
              <select value={String(resource.status)} disabled={setStatus.isPending} onChange={(e) => setStatus.mutate(e.target.value)} className={`${FIELD_SOFT} mt-1`}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      <div className="mb-5">
        <Tabs items={TABS} active={tab} onChange={open} variant="soft" />
      </div>

      <div className={hidden("info")}>
        {editing && form ? (
          <PanelForm
            title="Modifier la ressource"
            onCancel={() => setForm(null)}
            pending={save.isPending}
            submitLabel="Enregistrer"
            error={error}
            onSubmit={(e) => {
              e.preventDefault();
              const msg = resourceError(form);
              if (msg) return setError(msg);
              setError(null);
              save.mutate();
            }}
          >
            <ResourceFields
              editing
              value={form}
              onChange={(patch) => setForm((p) => (p ? { ...p, ...patch } : p))}
              types={typesQuery.data?.content ?? []}
              groups={groupsQuery.data?.content ?? []}
              policies={policiesQuery.data?.content ?? []}
            />
          </PanelForm>
        ) : (
          <Section title="Informations générales" icon={Settings}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Type">{resource.typeName || resource.typeCode}</Detail>
              <Detail label="Groupe">{resource.groupName || resource.groupCode}</Detail>
              <Detail label="Politique de réservation">{resource.policyName || resource.policyCode}</Detail>
              <Detail label="Capacité">{resource.capacity ? `${resource.capacity} personne${resource.capacity > 1 ? "s" : ""}` : undefined}</Detail>
              <Detail label="Zone">{resource.zone}</Detail>
              <Detail label="Emplacement">{resource.locationLabel}</Detail>
              <Detail label="Durée de créneau">{resource.slotDurationMinutes ? `${resource.slotDurationMinutes} min` : undefined}</Detail>
              <Detail label="Ordre d'affichage">{resource.displayOrder !== null && resource.displayOrder !== undefined ? String(resource.displayOrder) : undefined}</Detail>
              <Detail label="Description" wide>{resource.description}</Detail>
            </div>
          </Section>
        )}
      </div>

      {seen("amenities") && (
        <div className={`space-y-4 ${hidden("amenities")}`}>
          <Section
            title="Équipements associés"
            icon={Coffee}
            action={!linking && <ActionButton icon={Plus} onClick={() => { setLinkError(null); setLinking({ amenityCode: "", quantity: 1, optional: false, extraPrice: 0 }); }}>Ajouter</ActionButton>}
          >
            {linking && (
              <div className="mb-4">
                <PanelForm
                  title="Associer un équipement"
                  onCancel={() => setLinking(null)}
                  pending={link.isPending}
                  submitLabel="Associer"
                  submitDisabled={!linking.amenityCode}
                  error={linkError}
                  onSubmit={(e) => { e.preventDefault(); link.mutate(); }}
                >
                  <Field label="Équipement" required>
                    <select value={linking.amenityCode} onChange={(e) => setLinking({ ...linking, amenityCode: e.target.value })} className={FIELD}>
                      <option value="">{allAmenities.isLoading ? "Chargement" : "Choisir un équipement"}</option>
                      {(allAmenities.data?.content ?? []).filter((a) => a.active && !linked.some((x) => x.code === a.code)).map((a) => (
                        <option key={a.code} value={a.code}>{a.name}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Quantité">
                      <input type="number" min={1} value={linking.quantity} onChange={(e) => setLinking({ ...linking, quantity: Number(e.target.value) || 1 })} className={FIELD} />
                    </Field>
                    <Field label="Supplément (FCFA)" hint="0 si l'équipement est inclus.">
                      <input type="number" min={0} value={linking.extraPrice} onChange={(e) => setLinking({ ...linking, extraPrice: Number(e.target.value) || 0 })} className={FIELD} />
                    </Field>
                  </div>
                  <CheckField checked={linking.optional} onChange={(v) => setLinking({ ...linking, optional: v })} label="Équipement optionnel (à la demande du client)" />
                </PanelForm>
              </div>
            )}
            {amenitiesQuery.isLoading ? (
              <ListSkeleton rows={3} />
            ) : amenitiesQuery.isError ? (
              <ErrorBlock message="Impossible de charger les équipements." onRetry={() => amenitiesQuery.refetch()} />
            ) : linked.length === 0 ? (
              <EmptyState icon={Coffee} title="Aucun équipement associé" hint="Ajoutez le Wi-Fi, un écran, un tableau blanc…" />
            ) : (
              <div className="space-y-2">
                {linked.map((a) => (
                  <Row key={a.code}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{a.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {a.quantity ? <span>Quantité {a.quantity}</span> : null}
                        {a.optional !== null && a.optional !== undefined && <Tag tone={a.optional ? "pink" : "gray"}>{a.optional ? "Optionnel" : "Inclus"}</Tag>}
                        {a.extraPrice ? <span>+{formatMoney(a.extraPrice)}</span> : null}
                      </p>
                    </div>
                    <IconButton
                      icon={Unlink}
                      label="Dissocier"
                      tone="danger"
                      onClick={() =>
                        toast.confirm({
                          message: `Retirer « ${a.name} » de cette ressource ?`,
                          confirmLabel: "Retirer",
                          pendingLabel: "Retrait",
                          successMessage: "Équipement retiré",
                          errorMessage: "Retrait impossible",
                          onConfirm: () => unlink.mutateAsync(a.code),
                        })
                      }
                    />
                  </Row>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {seen("pricing") && (
        <div className={`space-y-4 ${hidden("pricing")}`}>
          <Section
            title="Règles de prix"
            icon={DollarSign}
            action={<ActionButton variant="ghost" icon={Plus} onClick={() => navigate(`/resources/pricing/create?resource=${code}`)}>Nouvelle règle</ActionButton>}
          >
            {pricingQuery.isLoading ? (
              <ListSkeleton rows={3} />
            ) : pricingQuery.isError ? (
              <ErrorBlock message="Impossible de charger les tarifs." onRetry={() => pricingQuery.refetch()} />
            ) : rules.length === 0 ? (
              <EmptyState icon={DollarSign} title="Aucun tarif" hint="Sans règle de prix, la ressource ne peut pas être facturée." />
            ) : (
              <div className="space-y-2">
                {rules.map((r) => (
                  <Row key={r.id} onClick={() => navigate(`/resources/pricing/${r.id}`)}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{r.label || UNIT_LABEL[r.bookingUnit]}</p>
                      <p className="text-xs text-gray-500">
                        {UNIT_LABEL[r.bookingUnit] ?? r.bookingUnit}
                        {r.dayOfWeek ? `, ${dayLabel(r.dayOfWeek).toLowerCase()}` : ""}
                        {r.startsAt ? `, de ${hhmm(r.startsAt)} à ${hhmm(r.endsAt)}` : ""}
                        {r.active ? "" : ", inactive"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-gray-950">{formatMoney(r.price)}</p>
                  </Row>
                ))}
              </div>
            )}
          </Section>
          <Section title="Calculer un tarif" description="Simule le prix final pour une période, règles comprises." icon={Calculator}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Unité">
                <select value={quote.bookingUnit} onChange={(e) => setQuote({ ...quote, bookingUnit: e.target.value as ResourceBookingUnit })} className={FIELD}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{UNIT_LABEL[u]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Début">
                <input type="datetime-local" value={quote.startedAt} onChange={(e) => setQuote({ ...quote, startedAt: e.target.value })} className={FIELD} />
              </Field>
              <Field label="Fin" error={quote.startedAt && quote.endedAt && !quoteReady ? "La fin doit être après le début." : undefined}>
                <input type="datetime-local" value={quote.endedAt} onChange={(e) => setQuote({ ...quote, endedAt: e.target.value })} className={FIELD} />
              </Field>
            </div>
            <div className="mt-4">
              <ActionButton icon={Calculator} pending={quoteMutation.isPending} disabled={!quoteReady} onClick={() => quoteMutation.mutate()}>Calculer</ActionButton>
            </div>
            {quoteMutation.isError && <p className="mt-3 text-sm font-semibold text-red-600">{apiMessage(quoteMutation.error, "Impossible de calculer le tarif.")}</p>}
            {quoteResult && (
              <div className="mt-4 grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-3">
                <Detail label="Prix de base">{formatMoney(quoteResult.basePrice)}</Detail>
                <Detail label="Prix final">{formatMoney(quoteResult.finalPrice)}</Detail>
                <Detail label="Règle appliquée">{quoteResult.appliedRuleLabel || (quoteResult.appliedRuleId ? `Règle n° ${quoteResult.appliedRuleId}` : "Tarif de base")}</Detail>
              </div>
            )}
          </Section>
        </div>
      )}

      {seen("availability") && (
        <div className={hidden("availability")}>
          <Section title="Créneaux ouverts" icon={CalendarDays} action={<ActionButton variant="ghost" onClick={() => navigate("/resources", { state: { activeTab: "schedule" } })}>Gérer l'agenda</ActionButton>}>
            {availQuery.isLoading ? (
              <ListSkeleton rows={4} />
            ) : availQuery.isError ? (
              <ErrorBlock message="Impossible de charger les disponibilités." onRetry={() => availQuery.refetch()} />
            ) : (availQuery.data?.content ?? []).length === 0 ? (
              <EmptyState icon={CalendarDays} title="Aucun créneau" hint="Ouvrez des créneaux depuis l'agenda pour permettre les réservations." />
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {availQuery.data!.content.map((slot) => (
                    <Row key={slot.id}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">{formatDateTime(slot.startedAt)}</p>
                        <p className="text-xs text-gray-500">jusqu'à {formatDateTime(slot.endedAt)}</p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-gray-600">{slot.remainingCapacity}/{slot.totalCapacity} places</span>
                    </Row>
                  ))}
                </div>
                <div className="mt-3">
                  <Pagination page={avPage} totalPages={availQuery.data?.totalPages ?? 1} total={availQuery.data?.totalElements ?? 0} noun="créneau" onChange={setAvPage} />
                </div>
              </>
            )}
          </Section>
        </div>
      )}

      {seen("calendar") && (
        <div className={hidden("calendar")}>
          <Section title="Calendrier" icon={CalendarDays}>
            {calendarQuery.isError ? (
              <ErrorBlock message="Impossible de charger le calendrier." onRetry={() => calendarQuery.refetch()} />
            ) : (
              <div className={calendarQuery.isLoading ? "pointer-events-none opacity-60" : ""}>
                <ResourceAvailabilityCalendar
                  month={calMonth}
                  onMonthChange={setCalMonth}
                  slots={(calendarQuery.data?.days || []).map((d, i) => ({
                    id: i,
                    resourceCode: code!,
                    startedAt: `${d.date}T00:00:00`,
                    endedAt: `${d.date}T23:59:59`,
                    slotDurationMinutes: 0,
                    totalCapacity: d.totalCapacity,
                    remainingCapacity: d.remainingCapacity,
                    available: d.status !== "FULL",
                    active: true,
                  }))}
                  closures={[]}
                />
              </div>
            )}
          </Section>
        </div>
      )}
    </DetailShell>
  );
};
