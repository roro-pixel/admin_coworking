import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle,
  Clock,
  Image,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Unlock,
  Users,
  XCircle,
} from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type {
  AdminCalendarSlot,
  OccupancyLevel,
  ResourceBookingUnit,
  ResourceSummaryResponse,
} from "../../../services/resource.service";
import { ResourceAutocomplete } from "../../../components/resources/ResourceAutocomplete";

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50";
const softBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";

const bookingUnits: ResourceBookingUnit[] = ["HOUR", "HALF_DAY", "DAY", "WEEK", "MONTH"];
const occupancyLabel: Record<string, string> = {
  FREE: "Libre",
  PARTIALLY_OCCUPIED: "Partiel",
  HIGHLY_OCCUPIED: "Très occupé",
  FULL: "Complet",
};

const occupancyClass: Record<string, string> = {
  FREE: "bg-green-50 text-green-700 ring-green-100",
  PARTIALLY_OCCUPIED: "bg-yellow-50 text-yellow-700 ring-yellow-100",
  HIGHLY_OCCUPIED: "bg-orange-50 text-orange-700 ring-orange-100",
  FULL: "bg-red-50 text-red-700 ring-red-100",
};

const SectionCard: React.FC<{
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ title, description, icon: Icon, children }) => (
  <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
    <div className="mb-5 flex items-start gap-3">
      <div className="rounded-2xl bg-primary-50 p-3 text-primary-600">
        <Icon size={20} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-950">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
    {children}
  </section>
);

const toDate = (month: string, end = false) => {
  const [year, rawMonth] = month.split("-").map(Number);
  const day = end ? new Date(year, rawMonth, 0).getDate() : 1;
  return `${month}-${String(day).padStart(2, "0")}`;
};

const formatDateTime = (value?: string) =>
  value
    ? new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
    : "—";

export const ResourcePlanningAdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedResource, setSelectedResource] = useState<ResourceSummaryResponse | null>(null);
  const [resourceCode, setResourceCode] = useState("");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [remainingForm, setRemainingForm] = useState({ from: "", to: "", durationMinutes: 60 });
  const [availabilityForm, setAvailabilityForm] = useState({
    startedAt: "",
    endedAt: "",
    slotDurationMinutes: 60,
    totalCapacity: 1,
    active: true,
  });
  const [slotActionForm, setSlotActionForm] = useState({ id: "", quantity: 1 });
  const [quoteForm, setQuoteForm] = useState({
    bookingUnit: "HOUR" as ResourceBookingUnit,
    startedAt: "",
    endedAt: "",
  });
  const [photoForm, setPhotoForm] = useState({
    documentCode: "",
    caption: "",
    cover: false,
    displayOrder: 0,
  });
  const [editingPhotoId, setEditingPhotoId] = useState<number | null>(null);
  const [photoEditForm, setPhotoEditForm] = useState({
    documentCode: "",
    caption: "",
    cover: false,
    displayOrder: 0,
  });

  const fromDate = toDate(month, false);
  const toDateValue = toDate(month, true);

  const adminCalendarQuery = useQuery({
    queryKey: ["resource-admin-calendar", resourceCode, month],
    queryFn: () => resourceService.getAdminCalendar(resourceCode, { fromDate, toDate: toDateValue }),
    enabled: !!resourceCode,
  });

  const publicCalendarQuery = useQuery({
    queryKey: ["resource-public-calendar", resourceCode, month],
    queryFn: () => resourceService.getPublicCalendar(resourceCode, { fromDate, toDate: toDateValue }),
    enabled: !!resourceCode,
  });

  const occupiedQuery = useQuery({
    queryKey: ["resource-occupied-slots", resourceCode, month],
    queryFn: () =>
      resourceService.getOccupiedSlots({
        resourceCode: resourceCode || undefined,
        from: `${fromDate}T00:00:00`,
        to: `${toDateValue}T23:59:59`,
        size: 200,
      }),
    enabled: !!resourceCode,
  });

  const groupedAvailabilityQuery = useQuery({
    queryKey: ["resource-availability-grouped", month],
    queryFn: () =>
      resourceService.getAvailabilitiesGrouped({
        from: `${fromDate}T00:00:00`,
        to: `${toDateValue}T23:59:59`,
        active: true,
      }),
  });

  const remainingQuery = useQuery({
    queryKey: ["resource-remaining-slots", resourceCode, remainingForm.from, remainingForm.to, remainingForm.durationMinutes],
    queryFn: () =>
      resourceService.searchRemainingSlots({
        resourceCode,
        from: remainingForm.from,
        to: remainingForm.to,
        durationMinutes: remainingForm.durationMinutes,
      }),
    enabled: false,
  });

  const photosQuery = useQuery({
    queryKey: ["resource-photos", resourceCode],
    queryFn: () => resourceService.getResourcePhotos(resourceCode),
    enabled: !!resourceCode,
  });

  const quoteQuery = useQuery({
    queryKey: ["resource-price-quote", resourceCode, quoteForm],
    queryFn: () =>
      resourceService.quotePrice({
        resourceCode,
        bookingUnit: quoteForm.bookingUnit,
        startedAt: quoteForm.startedAt,
        endedAt: quoteForm.endedAt,
      }),
    enabled: false,
  });

  const adminSlots: AdminCalendarSlot[] = useMemo(() => {
    const data: any = adminCalendarQuery.data;
    if (Array.isArray(data?.slots)) return data.slots;
    if (Array.isArray(data?.days)) return data.days.flatMap((day: any) => day.slots || []);
    return [];
  }, [adminCalendarQuery.data]);

  const days = publicCalendarQuery.data?.days || [];
  const occupied = occupiedQuery.data?.content || [];
  const grouped = groupedAvailabilityQuery.data || [];
  const photos = photosQuery.data || [];

  const stats = useMemo(() => {
    const total = adminSlots.length;
    const full = adminSlots.filter((s) => s.occupancyLevel === "FULL" || !s.available).length;
    const available = adminSlots.filter((s) => s.available).length;
    const occupiedSlots = occupied.length;
    return { total, full, available, occupiedSlots };
  }, [adminSlots, occupied.length]);

  const success = (text: string) => {
    setMessage(text);
    setError(null);
  };
  const fail = (e: any, fallback: string) => {
    setError(e?.response?.data?.message || e?.message || fallback);
    setMessage(null);
  };

  const createAvailabilityMutation = useMutation({
    mutationFn: () =>
      resourceService.createAvailability({
        resourceCode,
        startedAt: availabilityForm.startedAt,
        endedAt: availabilityForm.endedAt,
        slotDurationMinutes: Number(availabilityForm.slotDurationMinutes) || 60,
        totalCapacity: Number(availabilityForm.totalCapacity) || 1,
        active: availabilityForm.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-admin-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["resource-public-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["resource-availability-grouped"] });
      setAvailabilityForm({ startedAt: "", endedAt: "", slotDurationMinutes: 60, totalCapacity: 1, active: true });
      success("Créneau créé.");
    },
    onError: (e) => fail(e, "Erreur création disponibilité."),
  });

  const reserveMutation = useMutation({
    mutationFn: () => resourceService.reserveAvailabilitySlot(Number(slotActionForm.id), Number(slotActionForm.quantity) || 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-admin-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["resource-occupied-slots"] });
      success("Capacité réservée.");
    },
    onError: (e) => fail(e, "Erreur réservation capacité."),
  });

  const releaseMutation = useMutation({
    mutationFn: () => resourceService.releaseAvailabilitySlot(Number(slotActionForm.id), Number(slotActionForm.quantity) || 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-admin-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["resource-occupied-slots"] });
      success("Capacité libérée.");
    },
    onError: (e) => fail(e, "Erreur libération capacité."),
  });

  const addPhotoMutation = useMutation({
    mutationFn: () =>
      resourceService.addResourcePhoto(resourceCode, {
        documentCode: photoForm.documentCode,
        caption: photoForm.caption || undefined,
        cover: photoForm.cover,
        displayOrder: Number(photoForm.displayOrder) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-photos"] });
      setPhotoForm({ documentCode: "", caption: "", cover: false, displayOrder: 0 });
      success("Photo ajoutée.");
    },
    onError: (e) => fail(e, "Erreur ajout photo."),
  });

  const updatePhotoMutation = useMutation({
    mutationFn: () => {
      if (!editingPhotoId) throw new Error("Aucune photo sélectionnée.");
      return resourceService.updateResourcePhoto(resourceCode, editingPhotoId, {
        documentCode: photoEditForm.documentCode,
        caption: photoEditForm.caption || undefined,
        cover: photoEditForm.cover,
        displayOrder: Number(photoEditForm.displayOrder) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-photos"] });
      setEditingPhotoId(null);
      setPhotoEditForm({ documentCode: "", caption: "", cover: false, displayOrder: 0 });
      success("Photo mise à jour.");
    },
    onError: (e) => fail(e, "Erreur modification photo."),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (id: number) => resourceService.deleteResourcePhoto(resourceCode, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-photos"] });
      success("Photo supprimée.");
    },
    onError: (e) => fail(e, "Erreur suppression photo."),
  });

  const selectedCode = (code: string) => {
    setResourceCode(code);
    setRemainingForm({ from: `${fromDate}T08:00`, to: `${toDateValue}T18:00`, durationMinutes: 60 });
    setQuoteForm({ bookingUnit: "HOUR", startedAt: `${fromDate}T08:00`, endedAt: `${fromDate}T09:00` });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Planning ressources</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-950">Calendrier admin, occupation et disponibilité</h2>
            <p className="mt-1 text-sm text-gray-500">
              Visualisez l'occupation, les créneaux publics, les réservations, les disponibilités restantes, le devis tarifaire et la galerie.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="w-full md:w-80">
              <ResourceAutocomplete
                selectedResource={selectedResource}
                selectedCode={resourceCode}
                onSelect={(res) => {
                  setSelectedResource(res);
                  selectedCode(res?.code || "");
                }}
                placeholder="Sélectionner une ressource..."
              />
            </div>
            <input type="month" className={inputClass} value={month} onChange={(e) => setMonth(e.target.value)} />
            <button className={softBtn} onClick={() => { adminCalendarQuery.refetch(); publicCalendarQuery.refetch(); occupiedQuery.refetch(); }} disabled={!resourceCode}>
              <RefreshCw size={16} /> Actualiser
            </button>
          </div>
        </div>
      </div>

      {(message || error) && (
        <div className={`rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700 ring-1 ring-red-100" : "bg-green-50 text-green-700 ring-1 ring-green-100"}`}>
          {error || message}
        </div>
      )}

      {!resourceCode && (
        <div className="rounded-3xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100">
          <Search size={44} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-700">Sélectionnez une ressource pour charger son planning complet.</p>
        </div>
      )}

      {resourceCode && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Metric label="Créneaux admin" value={stats.total} icon={CalendarDays} />
            <Metric label="Disponibles" value={stats.available} icon={CheckCircle} />
            <Metric label="Occupés/complets" value={stats.full} icon={XCircle} />
            <Metric label="Réservations" value={stats.occupiedSlots} icon={Users} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <SectionCard title="Calendrier admin avec occupation" description="Créneaux détaillés avec niveau d'occupation et capacité restante." icon={CalendarDays}>
              {adminCalendarQuery.isLoading ? (
                <div className="py-10 text-center text-sm text-gray-500"><Loader2 className="mx-auto mb-2 animate-spin" /> Chargement...</div>
              ) : adminSlots.length === 0 ? (
                <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500">Aucun créneau sur ce mois.</p>
              ) : (
                <div className="max-h-[640px] overflow-auto rounded-2xl ring-1 ring-gray-100">
                  <table className="w-full border-separate border-spacing-y-2 p-2">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-gray-400">
                        <th className="px-4 py-2 text-left">Début</th>
                        <th className="px-4 py-2 text-left">Fin</th>
                        <th className="px-4 py-2 text-center">Capacité</th>
                        <th className="px-4 py-2 text-center">Occupation</th>
                        <th className="px-4 py-2 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminSlots.map((slot: any, index) => {
                        const level = (slot.occupancyLevel || (slot.available ? "FREE" : "FULL")) as OccupancyLevel;
                        return (
                          <tr key={`${slot.startedAt}-${index}`} className="bg-gray-50/70 hover:bg-primary-50/40">
                            <td className="rounded-l-2xl px-4 py-3 text-sm text-gray-800">{formatDateTime(slot.startedAt)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(slot.endedAt)}</td>
                            <td className="px-4 py-3 text-center text-sm font-medium">{slot.remainingCapacity}/{slot.totalCapacity}</td>
                            <td className="px-4 py-3 text-center text-sm">{Math.round(slot.occupancyRate ?? 0)}%</td>
                            <td className="rounded-r-2xl px-4 py-3 text-center">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${occupancyClass[level] || occupancyClass.FREE}`}>
                                {occupancyLabel[level] || level}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Créneaux publics" description="Synthèse de disponibilité visible côté portail." icon={Clock}>
              <div className="space-y-2">
                {days.length === 0 ? <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">Aucune donnée publique.</p> : days.map((day) => (
                  <div key={day.date} className="flex items-center justify-between rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{new Date(day.date).toLocaleDateString("fr-FR")}</p>
                      <p className="text-xs text-gray-400">{day.availableSlots}/{day.totalSlots} créneaux · {day.remainingCapacity}/{day.totalCapacity} places</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${day.status === "FULL" ? "bg-red-50 text-red-700" : day.status === "PARTIAL" ? "bg-yellow-50 text-yellow-700" : "bg-green-50 text-green-700"}`}>{day.status}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard title="Création de disponibilités" description="Créer des créneaux avec durée et capacité." icon={CheckCircle}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input type="datetime-local" className={inputClass} value={availabilityForm.startedAt} onChange={(e) => setAvailabilityForm({ ...availabilityForm, startedAt: e.target.value })} />
                <input type="datetime-local" className={inputClass} value={availabilityForm.endedAt} onChange={(e) => setAvailabilityForm({ ...availabilityForm, endedAt: e.target.value })} />
                <input type="number" className={inputClass} value={availabilityForm.slotDurationMinutes} onChange={(e) => setAvailabilityForm({ ...availabilityForm, slotDurationMinutes: Number(e.target.value) })} placeholder="Durée créneau minutes" />
                <input type="number" className={inputClass} value={availabilityForm.totalCapacity} onChange={(e) => setAvailabilityForm({ ...availabilityForm, totalCapacity: Number(e.target.value) })} placeholder="Capacité" />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={availabilityForm.active} onChange={(e) => setAvailabilityForm({ ...availabilityForm, active: e.target.checked })} /> Active</label>
              <button className={`${primaryBtn} mt-4`} disabled={!availabilityForm.startedAt || !availabilityForm.endedAt || createAvailabilityMutation.isPending} onClick={() => createAvailabilityMutation.mutate()}>
                {createAvailabilityMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Créer disponibilité
              </button>
            </SectionCard>

            <SectionCard title="Disponibilités restantes" description="Rechercher les fenêtres libres pour une durée donnée." icon={Search}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_120px]">
                <input type="datetime-local" className={inputClass} value={remainingForm.from} onChange={(e) => setRemainingForm({ ...remainingForm, from: e.target.value })} />
                <input type="datetime-local" className={inputClass} value={remainingForm.to} onChange={(e) => setRemainingForm({ ...remainingForm, to: e.target.value })} />
                <input type="number" className={inputClass} value={remainingForm.durationMinutes} onChange={(e) => setRemainingForm({ ...remainingForm, durationMinutes: Number(e.target.value) })} />
              </div>
              <button className={`${softBtn} mt-3`} disabled={!remainingForm.from || !remainingForm.to || remainingQuery.isFetching} onClick={() => remainingQuery.refetch()}>
                Rechercher
              </button>
              <div className="mt-4 max-h-60 space-y-2 overflow-auto">
                {(remainingQuery.data || []).map((w, index) => (
                  <div key={`${w.startedAt}-${index}`} className="rounded-2xl bg-gray-50 p-3 text-sm ring-1 ring-gray-100">
                    <p className="font-medium text-gray-900">{formatDateTime(w.startedAt)} → {formatDateTime(w.endedAt)}</p>
                    <p className="text-xs text-gray-400">{w.durationMinutes} min · capacité restante {w.remainingCapacity} · {w.slotCount} créneau(x)</p>
                  </div>
                ))}
                {remainingQuery.isFetched && (remainingQuery.data || []).length === 0 && <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Aucune fenêtre libre.</p>}
              </div>
            </SectionCard>

            <SectionCard title="Réservation / libération de capacité" description="Action admin sur un créneau par ID." icon={Lock}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_auto_auto]">
                <input className={inputClass} value={slotActionForm.id} onChange={(e) => setSlotActionForm({ ...slotActionForm, id: e.target.value })} placeholder="ID disponibilité" />
                <input type="number" className={inputClass} value={slotActionForm.quantity} onChange={(e) => setSlotActionForm({ ...slotActionForm, quantity: Number(e.target.value) })} />
                <button className={primaryBtn} disabled={!slotActionForm.id || reserveMutation.isPending} onClick={() => reserveMutation.mutate()}><Lock size={16} /> Réserver</button>
                <button className={softBtn} disabled={!slotActionForm.id || releaseMutation.isPending} onClick={() => releaseMutation.mutate()}><Unlock size={16} /> Libérer</button>
              </div>
            </SectionCard>

            <SectionCard title="Devis tarifaire" description="Calculer le prix d'une période selon les règles tarifaires." icon={Clock}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr_1fr_auto]">
                <select className={inputClass} value={quoteForm.bookingUnit} onChange={(e) => setQuoteForm({ ...quoteForm, bookingUnit: e.target.value as ResourceBookingUnit })}>{bookingUnits.map((u) => <option key={u}>{u}</option>)}</select>
                <input type="datetime-local" className={inputClass} value={quoteForm.startedAt} onChange={(e) => setQuoteForm({ ...quoteForm, startedAt: e.target.value })} />
                <input type="datetime-local" className={inputClass} value={quoteForm.endedAt} onChange={(e) => setQuoteForm({ ...quoteForm, endedAt: e.target.value })} />
                <button className={primaryBtn} disabled={!quoteForm.startedAt || !quoteForm.endedAt || quoteQuery.isFetching} onClick={() => quoteQuery.refetch()}>Calculer</button>
              </div>
              {quoteQuery.data && (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Metric label="Base" value={quoteQuery.data.basePrice} suffix=" FCFA" icon={Clock} />
                  <Metric label="Final" value={quoteQuery.data.finalPrice} suffix=" FCFA" icon={CheckCircle} />
                  <Metric label="Règle" value={quoteQuery.data.appliedRuleId || 0} icon={Search} />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Créneaux occupés" description="Liste des réservations/occupations sur la période." icon={Users}>
              <div className="max-h-72 space-y-2 overflow-auto">
                {occupied.length === 0 ? <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">Aucun créneau occupé.</p> : occupied.map((slot: any, index) => (
                  <div key={`${slot.bookingCode || index}-${slot.startedAt}`} className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{slot.customerName || slot.memberName || slot.bookingCode || "Occupation"}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(slot.startedAt)} → {formatDateTime(slot.endedAt)}</p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Qté {slot.quantity || 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Galerie photos" description="Associer les documents GED comme photos de ressource." icon={Image}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_100px]">
                <input className={inputClass} value={photoForm.documentCode} onChange={(e) => setPhotoForm({ ...photoForm, documentCode: e.target.value })} placeholder="Code document GED" />
                <input className={inputClass} value={photoForm.caption} onChange={(e) => setPhotoForm({ ...photoForm, caption: e.target.value })} placeholder="Légende" />
                <input type="number" className={inputClass} value={photoForm.displayOrder} onChange={(e) => setPhotoForm({ ...photoForm, displayOrder: Number(e.target.value) })} />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={photoForm.cover} onChange={(e) => setPhotoForm({ ...photoForm, cover: e.target.checked })} /> Photo de couverture</label>
              <button className={`${primaryBtn} mt-3`} disabled={!photoForm.documentCode || addPhotoMutation.isPending} onClick={() => addPhotoMutation.mutate()}><Image size={16} /> Ajouter photo</button>
              <div className="mt-4 space-y-2">
                {photos.length === 0 ? <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">Aucune photo associée.</p> : photos.map((photo) => (
                  <div key={photo.id} className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
                    {editingPhotoId === photo.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_100px]">
                          <input className={inputClass} value={photoEditForm.documentCode} onChange={(e) => setPhotoEditForm({ ...photoEditForm, documentCode: e.target.value })} placeholder="Document GED" />
                          <input className={inputClass} value={photoEditForm.caption} onChange={(e) => setPhotoEditForm({ ...photoEditForm, caption: e.target.value })} placeholder="Légende" />
                          <input type="number" className={inputClass} value={photoEditForm.displayOrder} onChange={(e) => setPhotoEditForm({ ...photoEditForm, displayOrder: Number(e.target.value) })} />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={photoEditForm.cover} onChange={(e) => setPhotoEditForm({ ...photoEditForm, cover: e.target.checked })} /> Photo de couverture</label>
                        <div className="flex gap-2">
                          <button className={primaryBtn} onClick={() => updatePhotoMutation.mutate()} disabled={updatePhotoMutation.isPending}>Enregistrer</button>
                          <button className={softBtn} onClick={() => setEditingPhotoId(null)}>Annuler</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{photo.caption || photo.documentCode}</p>
                          <p className="font-mono text-xs text-gray-400">{photo.documentCode} · ordre {photo.displayOrder}{photo.cover ? " · couverture" : ""}</p>
                        </div>
                        <div className="flex gap-1">
                          <button className="rounded-xl px-3 py-2 text-xs text-blue-600 hover:bg-blue-50" onClick={() => { setEditingPhotoId(photo.id); setPhotoEditForm({ documentCode: photo.documentCode, caption: photo.caption || "", cover: photo.cover, displayOrder: photo.displayOrder || 0 }); }}>Modifier</button>
                          {!photo.cover && <button className="rounded-xl px-3 py-2 text-xs text-primary-600 hover:bg-primary-50" onClick={() => { setEditingPhotoId(photo.id); setPhotoEditForm({ documentCode: photo.documentCode, caption: photo.caption || "", cover: true, displayOrder: photo.displayOrder || 0 }); setTimeout(() => updatePhotoMutation.mutate(), 0); }}>Couverture</button>}
                          <button className="rounded-xl p-2 text-red-600 hover:bg-red-50" onClick={() => deletePhotoMutation.mutate(photo.id)}><XCircle size={16} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Disponibilités groupées" description="Vue synthétique multi-ressources sur le mois." icon={CalendarDays}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {grouped.length === 0 ? <p className="text-sm text-gray-500">Aucune disponibilité groupée.</p> : grouped.map((group) => (
                <div key={group.resourceCode} className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
                  <p className="font-medium text-gray-900">{group.resourceName}</p>
                  <p className="font-mono text-xs text-gray-400">{group.resourceCode}</p>
                  <p className="mt-2 text-sm text-gray-500">{group.availabilities.length} créneau(x)</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number; suffix?: string; icon: React.ElementType }> = ({ label, value, suffix = "", icon: Icon }) => (
  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
    <div className="flex items-center justify-between text-sm text-gray-500">
      <span>{label}</span>
      <Icon size={17} className="text-gray-400" />
    </div>
    <p className="mt-2 text-2xl font-bold text-gray-950">{value.toLocaleString("fr-FR")}{suffix}</p>
  </div>
);
