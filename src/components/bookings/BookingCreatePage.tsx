import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarClock, Clock, Gift, Lock, PackagePlus, Percent, Phone, Plus, Repeat, Trash2, UserRound, Users, Wallet } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { BookingHold, BookingOption, BookingParticipant, BookingPaymentMode, BookingUnit, CreateBookingRequest, LookupItem, OwnerFields } from "../../services/booking.service";
import { resourceService } from "../../services/resource.service";
import type { ResourceSummaryResponse } from "../../services/resource.service";
import { serviceCatalogService } from "../../services/serviceCatalog.service";
import { ActionButton, Field, IconButton, ItemRow, PageHeader, Section, StatusChip, Switch, Tabs } from "../subscription/kit";
import type { TabItem } from "../subscription/kit";
import { FIELD, apiMessage, formatDateTime } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";
import { DetailShell, formatDuration, toLocalInput, useDebounced, withSeconds } from "../resources/resKit";
import { ResourceAutocomplete } from "../resources/ResourceAutocomplete";
import {
  ErrorLines,
  OwnerPicker,
  PAYMENT_MODE_LABEL,
  ReasonSelect,
  TEAM_CHANNELS,
  CHANNEL_LABEL,
  UNIT_LABEL,
  errorList,
  errorReason,
  errorText,
  hm,
  label,
  money,
  ownerFields,
  refList,
  useBookingReference,
} from "./bookingKit";

type OwnerMode = "existing" | "walkin" | "call";
const MODES: TabItem<OwnerMode>[] = [
  { id: "existing", label: "Client existant", icon: UserRound },
  { id: "walkin", label: "Invité de passage", icon: Users },
  { id: "call", label: "Prise d'appel", icon: Phone },
];

const PAYMENTS: { id: BookingPaymentMode; hint: string; icon: React.ElementType }[] = [
  { id: "DIRECT", hint: "Encaissement à part (espèces, mobile money…)", icon: Wallet },
  { id: "WALLET", hint: "Fonds bloqués sur le portefeuille", icon: Wallet },
  { id: "SUBSCRIPTION", hint: "Couvert par un droit d'abonnement", icon: Building2 },
  { id: "PASS", hint: "Couvert par un droit de pass", icon: Gift },
];

const DURATIONS = [30, 60, 90, 120, 180, 240, 480];
const TTLS = [5, 10, 15, 30, 60];
const FREQUENCIES: { id: "DAILY" | "WEEKLY" | "MONTHLY"; label: string }[] = [
  { id: "DAILY", label: "jour(s)" },
  { id: "WEEKLY", label: "semaine(s)" },
  { id: "MONTHLY", label: "mois" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const addMinutes = (local: string, min: number) => {
  const d = new Date(local);
  d.setMinutes(d.getMinutes() + min);
  return toInput(d);
};
const minutesBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
const nextHour = () => {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toInput(d);
};
const newKey = () => `bk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

interface ParticipantForm {
  name: string;
  email: string;
  phone: string;
  role: "GUEST" | "HOST" | "ORGANIZER";
}

export const BookingCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: reference } = useBookingReference();

  // Titulaire
  const [mode, setMode] = useState<OwnerMode>("existing");
  const [owner, setOwner] = useState<LookupItem | null>(null);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [caller, setCaller] = useState({ fullName: "", phone: "", email: "", company: "", callNote: "", createLead: true });
  const [company, setCompany] = useState<LookupItem | null>(null);

  // Créneau
  const [resource, setResource] = useState<ResourceSummaryResponse | null>(null);
  const [start, setStart] = useState(nextHour());
  const [end, setEnd] = useState(addMinutes(nextHour(), 60));
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<BookingUnit | "">("");

  // Règlement et envoi
  const [paymentMode, setPaymentMode] = useState<BookingPaymentMode>("DIRECT");
  const [payOnSite, setPayOnSite] = useState(false);
  const [depositRate, setDepositRate] = useState("");
  const [confirmNow, setConfirmNow] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [channel, setChannel] = useState("");

  // Extras
  const [options, setOptions] = useState<BookingOption[]>([]);
  const [optKind, setOptKind] = useState<"SERVICE" | "AMENITY">("SERVICE");
  const [optCode, setOptCode] = useState("");
  const [optQty, setOptQty] = useState(1);
  const [discount, setDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<"rate" | "amount">("rate");
  const [discountValue, setDiscountValue] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountText, setDiscountText] = useState("");
  const [participants, setParticipants] = useState<ParticipantForm[]>([]);
  const [notes, setNotes] = useState("");

  // Série
  const [repeat, setRepeat] = useState(false);
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [interval, setIntervalValue] = useState(1);
  const [endBy, setEndBy] = useState<"count" | "date">("count");
  const [occurrences, setOccurrences] = useState(4);
  const [endDate, setEndDate] = useState("");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [excludeInput, setExcludeInput] = useState("");

  // Option (blocage)
  const [hold, setHold] = useState<BookingHold | null>(null);
  const [ttl, setTtl] = useState(10);
  const holdRef = useRef<BookingHold | null>(null);
  const consumed = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const guest = mode === "walkin" || (mode === "call" && !owner);
  const slotStep = (resource?.slotDurationMinutes ?? 15) * 60;

  // ── Titulaire en champs de requête ──
  const identity = useMemo<OwnerFields>(() => {
    if (mode === "walkin") {
      return { walkIn: true, contactName: contact.name.trim() || undefined, contactEmail: contact.email.trim() || undefined, contactPhone: contact.phone.trim() || undefined };
    }
    if (mode === "call") {
      if (owner) return ownerFields(owner);
      return { contactName: caller.fullName.trim() || undefined, contactEmail: caller.email.trim() || undefined, contactPhone: caller.phone.trim() || undefined };
    }
    return {
      ...ownerFields(owner),
      ...(contact.name.trim() ? { contactName: contact.name.trim() } : {}),
      ...(contact.email.trim() ? { contactEmail: contact.email.trim() } : {}),
      ...(contact.phone.trim() ? { contactPhone: contact.phone.trim() } : {}),
    };
  }, [mode, owner, contact, caller]);

  const ownerReady =
    mode === "existing" ? !!owner : mode === "walkin" ? !!contact.name.trim() && !!(contact.email.trim() || contact.phone.trim()) : !!owner || (!!caller.fullName.trim() && !!caller.phone.trim());
  const slotReady = !!resource && !!start && !!end && end > start;
  const ready = ownerReady && slotReady;
  const billingCompanyCode = company ? company.code : undefined;

  // Un invité ne peut pas payer par abonnement ou pass
  useEffect(() => {
    if (guest && (paymentMode === "SUBSCRIPTION" || paymentMode === "PASS")) setPaymentMode("DIRECT");
  }, [guest, paymentMode]);
  useEffect(() => {
    if (paymentMode !== "DIRECT") {
      setPayOnSite(false);
      setDepositRate("");
    }
  }, [paymentMode]);

  // ── Disponibilité et devis ──
  const availabilityPayload = useMemo(
    () =>
      ready
        ? {
            ...identity,
            resourceCode: resource!.code,
            paymentMode,
            billingCompanyCode,
            bookingUnit: unit || undefined,
            startedAt: withSeconds(start),
            endedAt: withSeconds(end),
            quantity,
          }
        : null,
    [ready, identity, resource, paymentMode, billingCompanyCode, unit, start, end, quantity],
  );
  const debouncedKey = useDebounced(availabilityPayload ? JSON.stringify(availabilityPayload) : "", 500);
  const checkPayload = debouncedKey ? (JSON.parse(debouncedKey) as NonNullable<typeof availabilityPayload>) : null;
  const stale = (availabilityPayload ? JSON.stringify(availabilityPayload) : "") !== debouncedKey;

  const availability = useQuery({
    queryKey: ["booking-availability", debouncedKey],
    queryFn: () => bookingService.checkAvailability(checkPayload!),
    enabled: !!checkPayload,
    retry: false,
    staleTime: 0,
  });
  const a = availability.data;
  const suggestions = useQuery({
    queryKey: ["booking-suggestions", debouncedKey],
    queryFn: () => bookingService.getSuggestions(checkPayload!),
    enabled: !!checkPayload && a?.available === false,
    retry: false,
  });
  const available = !!a && a.available && !stale && !availability.isFetching;

  // ── Blocage temporaire ──
  const holdSignature = JSON.stringify([resource?.code, start, end, quantity, identity]);
  const holdSig = useRef("");
  useEffect(() => {
    holdRef.current = hold;
  }, [hold]);
  useEffect(() => {
    if (hold && holdSig.current !== holdSignature) {
      bookingService.releaseHold(hold.holdNumber).catch(() => undefined);
      setHold(null);
      toast.success("Option libérée : la saisie a changé");
    }
  }, [holdSignature, hold]);
  useEffect(
    () => () => {
      const h = holdRef.current;
      if (h && !consumed.current) bookingService.releaseHold(h.holdNumber).catch(() => undefined);
    },
    [],
  );

  const takeHold = useMutation({
    mutationFn: () =>
      bookingService.createHold({
        ...identity,
        resourceCode: resource!.code,
        startedAt: withSeconds(start),
        endedAt: withSeconds(end),
        quantity,
        ttlMinutes: ttl,
        idempotencyKey: newKey(),
      }),
    onSuccess: (h) => {
      holdSig.current = holdSignature;
      setHold(h);
      toast.success("Créneau retenu");
    },
    onError: (e) => toast.error(apiMessage(e, "Impossible de retenir le créneau")),
  });
  const dropHold = useMutation({
    mutationFn: () => bookingService.releaseHold(hold!.holdNumber),
    onSuccess: () => {
      setHold(null);
      toast.success("Option libérée");
    },
    onError: (e) => toast.error(apiMessage(e, "Libération impossible")),
  });

  // ── Catalogues pour les options ──
  const services = useQuery({ queryKey: ["booking-opt-services"], queryFn: () => serviceCatalogService.getCatalogue(false), staleTime: 5 * 60_000 });
  const amenities = useQuery({ queryKey: ["booking-opt-amenities"], queryFn: () => resourceService.getAmenities({ size: 500 }), staleTime: 5 * 60_000 });
  const optionChoices = optKind === "SERVICE" ? (services.data ?? []).map((s) => ({ code: s.code, name: s.name })) : (amenities.data?.content ?? []).filter((x) => x.active).map((x) => ({ code: x.code, name: x.name }));
  const nameOf = (o: BookingOption) =>
    (o.kind === "SERVICE" ? (services.data ?? []).find((s) => s.code === o.code)?.name : (amenities.data?.content ?? []).find((x) => x.code === o.code)?.name) ?? o.code;

  // ── Création ──
  const idemRef = useRef({ sig: "", key: newKey() });
  const body = (): CreateBookingRequest => {
    const b: CreateBookingRequest = {
      ...identity,
      resourceCode: resource!.code,
      startedAt: withSeconds(start),
      endedAt: withSeconds(end),
      quantity,
      paymentMode,
      confirmImmediately: confirmNow,
      sendEmail,
    };
    if (unit) b.bookingUnit = unit;
    if (billingCompanyCode) b.billingCompanyCode = billingCompanyCode;
    if (notes.trim()) b.notes = notes.trim();
    if (channel) b.channel = channel as CreateBookingRequest["channel"];
    if (options.length) b.options = options;
    if (payOnSite) b.payOnSite = true;
    if (paymentMode === "DIRECT" && Number(depositRate) > 0) b.depositRate = Number(depositRate);
    if (discount && discountValue) {
      b.priceAdjustment = {
        ...(discountType === "rate" ? { discountRate: Number(discountValue) } : { newAmount: Number(discountValue) }),
        reasonCode: discountCode || undefined,
        reasonText: discountText.trim() || undefined,
      };
    }
    if (mode === "call") {
      b.caller = {
        fullName: caller.fullName.trim() || undefined,
        phone: caller.phone.trim() || undefined,
        email: caller.email.trim() || undefined,
        company: caller.company.trim() || undefined,
        callNote: caller.callNote.trim() || undefined,
        createLead: caller.createLead ? undefined : false,
      };
    }
    const people = participants.filter((p) => p.name.trim());
    if (people.length) b.participants = people.map((p) => ({ name: p.name.trim(), email: p.email.trim() || undefined, phone: p.phone.trim() || undefined, role: p.role })) as Omit<BookingParticipant, "id" | "status">[];
    return b;
  };

  const create = useMutation({
    mutationFn: async () => {
      const b = body();
      if (repeat) {
        const list = await bookingService.createRecurring({
          booking: b,
          frequency,
          intervalValue: interval > 1 ? interval : undefined,
          occurrences: endBy === "count" ? Math.min(60, Math.max(2, occurrences)) : 60,
          endDate: endBy === "date" && endDate ? endDate : undefined,
          excludedDates: excluded.length ? excluded : undefined,
        });
        return { first: list[0], count: list.length };
      }
      // Une clé par intention : elle change si la saisie change
      const sig = JSON.stringify(b);
      if (idemRef.current.sig !== sig) idemRef.current = { sig, key: newKey() };
      const created = await bookingService.createBooking({ ...b, idempotencyKey: idemRef.current.key, holdNumber: hold?.holdNumber });
      return { first: created, count: 1 };
    },
    onSuccess: ({ first, count }) => {
      consumed.current = true;
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-planning"] });
      toast.success(count > 1 ? `${count} réservations créées` : `Réservation ${first.bookingNumber} créée`);
      navigate(`/bookings/${first.bookingNumber}`);
    },
    onError: (e) => {
      const reason = errorReason(e);
      const known = ["PAY_ON_SITE_NOT_ALLOWED", "PREPAYMENT_REQUIRED", "COMPANY_BUDGET_EXCEEDED"].includes(reason ?? "");
      setError(errorText(e, known ? "Réservation refusée" : "Création impossible"));
      setErrors(errorList(e));
    },
  });

  // ── Validation du formulaire ──
  const adjustmentValid = !discount || (!!discountValue && Number(discountValue) > 0 && !!discountCode && (discountCode !== "OTHER" || !!discountText.trim()));
  const recurringValid = !repeat || (endBy === "count" ? occurrences >= 2 && occurrences <= 60 : !!endDate);
  const canSubmit = ready && available && adjustmentValid && recurringValid && !create.isPending;

  const addOption = () => {
    if (!optCode) return;
    setOptions((list) => {
      const i = list.findIndex((o) => o.kind === optKind && o.code === optCode);
      if (i >= 0) return list.map((o, k) => (k === i ? { ...o, quantity: (o.quantity ?? 1) + optQty } : o));
      return [...list, { kind: optKind, code: optCode, quantity: optQty }];
    });
    setOptCode("");
    setOptQty(1);
  };

  const applySuggestion = (s: { resourceCode: string; resourceName: string; startedAt: string; endedAt: string }) => {
    if (s.resourceCode !== resource?.code) {
      setResource({ code: s.resourceCode, name: s.resourceName, typeCode: null, status: "", bookingEnabled: true, portalVisible: true, active: true });
    }
    setStart(toLocalInput(s.startedAt));
    setEnd(toLocalInput(s.endedAt));
  };

  const duration = slotReady ? minutesBetween(start, end) : 0;
  const pastStart = !!start && new Date(start).getTime() < Date.now();

  return (
    <DetailShell>
      <PageHeader title="Nouvelle réservation" subtitle="Vérifiez la disponibilité, puis créez la réservation. Le prix est calculé par le serveur." onBack={() => navigate("/bookings")} backLabel="Réservations" />

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setErrors([]);
          create.mutate();
        }}
      >
        {/* ── Titulaire ── */}
        <Section title="Titulaire" icon={UserRound}>
          <Tabs items={MODES} active={mode} onChange={(m) => { setMode(m); setError(null); }} variant="soft" />
          <div className="mt-4 space-y-4">
            {mode === "existing" && (
              <>
                <Field label="Membre, client ou entreprise" required>
                  <OwnerPicker value={owner} onChange={setOwner} />
                </Field>
                <p className="text-xs text-gray-500">Coordonnées différentes pour cette réservation (facultatif) :</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder="Nom du contact" className={FIELD} aria-label="Nom du contact" />
                  <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder="Courriel" className={FIELD} aria-label="Courriel" />
                  <input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="Téléphone" className={FIELD} aria-label="Téléphone" />
                </div>
              </>
            )}
            {mode === "walkin" && (
              <>
                <p className="text-sm text-gray-600">Une fiche d'invité est créée pour cette réservation. Il ne peut pas payer par abonnement ou pass.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Nom" required><input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={FIELD} /></Field>
                  <Field label="Courriel" hint="Courriel ou téléphone"><input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={FIELD} /></Field>
                  <Field label="Téléphone"><input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={FIELD} /></Field>
                </div>
              </>
            )}
            {mode === "call" && (
              <>
                <p className="text-sm text-gray-600">Rendez-vous pris au téléphone. Un appelant inconnu devient un prospect du CRM, relié à la réservation.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nom de l'appelant" required={!owner}><input value={caller.fullName} onChange={(e) => setCaller({ ...caller, fullName: e.target.value })} className={FIELD} /></Field>
                  <Field label="Téléphone" required={!owner}><input value={caller.phone} onChange={(e) => setCaller({ ...caller, phone: e.target.value })} className={FIELD} /></Field>
                  <Field label="Courriel" hint="Pour la confirmation"><input type="email" value={caller.email} onChange={(e) => setCaller({ ...caller, email: e.target.value })} className={FIELD} /></Field>
                  <Field label="Société"><input value={caller.company} onChange={(e) => setCaller({ ...caller, company: e.target.value })} className={FIELD} /></Field>
                </div>
                <Field label="Note d'appel"><textarea value={caller.callNote} onChange={(e) => setCaller({ ...caller, callNote: e.target.value })} rows={2} className={`${FIELD} resize-none`} /></Field>
                <Field label="L'appelant est déjà client ?" hint="Le choisir évite de créer un prospect.">
                  <OwnerPicker value={owner} onChange={setOwner} />
                </Field>
                {!owner && <Switch checked={caller.createLead} onChange={(v) => setCaller({ ...caller, createLead: v })} label="Créer un prospect dans le CRM" hint="Source « Téléphone », avec une activité d'appel portant la note." />}
              </>
            )}
            {!guest && (
              <Field label="Réservation pour le compte d'une entreprise (facultatif)" hint="L'entreprise doit être rattachée au membre. Vide : le membre paie seul.">
                <OwnerPicker value={company} onChange={setCompany} types="BUSINESS_ENTITY" placeholder="Rechercher l'entreprise" />
              </Field>
            )}
          </div>
        </Section>

        {/* ── Créneau ── */}
        <Section title="Ressource et créneau" icon={CalendarClock}>
          <div className="space-y-4">
            <Field label="Ressource" required>
              <ResourceAutocomplete selectedResource={resource} onSelect={setResource} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Début" required hint={pastStart ? "Début passé : permis à l'équipe jusqu'à 31 jours en arrière." : undefined}>
                <input
                  type="datetime-local"
                  step={slotStep}
                  value={start}
                  onChange={(e) => {
                    const keep = slotReady ? minutesBetween(start, end) : 60;
                    setStart(e.target.value);
                    if (e.target.value) setEnd(addMinutes(e.target.value, keep > 0 ? keep : 60));
                  }}
                  className={FIELD}
                />
              </Field>
              <Field label="Fin" required hint={slotReady ? `Durée : ${formatDuration(duration)}` : "La fin doit suivre le début."}>
                <input type="datetime-local" step={slotStep} value={end} min={start} onChange={(e) => setEnd(e.target.value)} className={FIELD} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => start && setEnd(addMinutes(start, d))}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${duration === d ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  {formatDuration(d)}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quantité" hint="Places pour un espace partagé, 1 pour une pièce entière.">
                <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} className={FIELD} />
              </Field>
              <Field label="Unité facturée" hint="Vide : selon les règles tarifaires de la ressource.">
                <select value={unit} onChange={(e) => setUnit(e.target.value as BookingUnit | "")} className={FIELD}>
                  <option value="">Selon la ressource</option>
                  {Object.entries(UNIT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </Section>

        {/* ── Règlement ── */}
        <Section title="Règlement" icon={Wallet}>
          <div className="grid gap-2 sm:grid-cols-2">
            {PAYMENTS.map((p) => {
              const disabled = guest && (p.id === "SUBSCRIPTION" || p.id === "PASS");
              const on = paymentMode === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPaymentMode(p.id)}
                  className={`rounded-2xl p-4 text-left transition ${on ? "bg-white ring-2 ring-[color:var(--logo-pink-dark)]" : "bg-white shadow-sm hover:bg-gray-50"} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  <p className="text-sm font-bold text-gray-900">{label(PAYMENT_MODE_LABEL, p.id)}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{disabled ? "Indisponible pour un invité" : p.hint}</p>
                </button>
              );
            })}
          </div>
          {paymentMode === "DIRECT" && (
            <div className="mt-4 space-y-4">
              <Switch checked={payOnSite} onChange={setPayOnSite} label="À régler sur place" hint="Le créneau est retenu jusqu'à l'échéance, la facture est émise pour l'encaissement." />
              <Field label="Acompte (%)" hint="Un acompte confirme la réservation. Vide : aucun.">
                <input type="number" min={0} max={100} value={depositRate} onChange={(e) => setDepositRate(e.target.value)} className={`${FIELD} sm:w-40`} />
              </Field>
            </div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Switch checked={confirmNow} onChange={setConfirmNow} label="Confirmer tout de suite" hint="Désactivé : la réservation reste en brouillon (sans effet en paiement direct ou avec approbation)." />
            <Switch checked={sendEmail} onChange={setSendEmail} label="Envoyer les courriels" hint="Désactivé : aucun courriel pour cette création." />
          </div>
          <div className="mt-4">
            <Field label="Canal de la demande" hint={mode === "call" ? "Vide : Téléphone." : "Vide : Équipe."}>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className={`${FIELD} sm:w-64`}>
                <option value="">{mode === "call" ? "Téléphone (par défaut)" : "Équipe (par défaut)"}</option>
                {TEAM_CHANNELS.map((c) => <option key={c} value={c}>{label(CHANNEL_LABEL, c)}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        {/* ── Options ── */}
        <Section title="Services et équipements" icon={PackagePlus} description="Ajoutés dès la création, sur la même facture.">
          {options.length > 0 && (
            <div className="mb-3 space-y-2">
              {options.map((o) => (
                <ItemRow key={`${o.kind}-${o.code}`} className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">{nameOf(o)} <span className="text-xs font-normal text-gray-500">· {o.kind === "SERVICE" ? "Service" : "Équipement"} · × {o.quantity ?? 1}</span></p>
                  <IconButton icon={Trash2} label="Retirer" tone="danger" onClick={() => setOptions(options.filter((x) => !(x.kind === o.kind && x.code === o.code)))} />
                </ItemRow>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-[9rem_1fr_6rem_auto]">
            <select value={optKind} onChange={(e) => { setOptKind(e.target.value as "SERVICE" | "AMENITY"); setOptCode(""); }} className={FIELD} aria-label="Type">
              <option value="SERVICE">Service</option>
              <option value="AMENITY">Équipement</option>
            </select>
            <select value={optCode} onChange={(e) => setOptCode(e.target.value)} className={FIELD} aria-label="Élément">
              <option value="">Choisir…</option>
              {optionChoices.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
            <input type="number" min={1} value={optQty} onChange={(e) => setOptQty(Math.max(1, Number(e.target.value) || 1))} className={FIELD} aria-label="Quantité" />
            <ActionButton variant="ghost" icon={Plus} disabled={!optCode} onClick={addOption}>Ajouter</ActionButton>
          </div>
        </Section>

        {/* ── Remise ── */}
        <Section title="Remise" icon={Percent} description="Seulement une baisse. Au-delà du plafond de l'équipe, la remise passe par une demande d'approbation et la réservation attend.">
          <Switch checked={discount} onChange={setDiscount} label="Ajuster le prix" />
          {discount && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Type">
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value as "rate" | "amount")} className={FIELD}>
                    <option value="rate">Remise en pourcentage</option>
                    <option value="amount">Nouveau montant</option>
                  </select>
                </Field>
                <Field label={discountType === "rate" ? "Remise (%)" : "Nouveau montant"} required>
                  <input type="number" min={0} max={discountType === "rate" ? 100 : undefined} step="any" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className={FIELD} />
                </Field>
              </div>
              <ReasonSelect values={refList(reference, "BOOKING_PRICE_ADJUSTMENT_REASON")} code={discountCode} text={discountText} onCode={setDiscountCode} onText={setDiscountText} required />
            </div>
          )}
        </Section>

        {/* ── Participants ── */}
        <Section
          title="Participants et invités"
          icon={Users}
          action={<ActionButton variant="ghost" icon={Plus} onClick={() => setParticipants([...participants, { name: "", email: "", phone: "", role: "GUEST" }])}>Ajouter</ActionButton>}
        >
          {participants.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun. Ajoutez les invités pour leur envoyer l'invitation.</p>
          ) : (
            <div className="space-y-3">
              {participants.map((p, i) => (
                <div key={i} className="grid gap-3 rounded-2xl bg-white p-3 shadow-sm sm:grid-cols-[1fr_1fr_1fr_8rem_auto]">
                  <input value={p.name} onChange={(e) => setParticipants(participants.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} placeholder="Nom" className={FIELD} aria-label="Nom" />
                  <input type="email" value={p.email} onChange={(e) => setParticipants(participants.map((x, k) => (k === i ? { ...x, email: e.target.value } : x)))} placeholder="Courriel" className={FIELD} aria-label="Courriel" />
                  <input value={p.phone} onChange={(e) => setParticipants(participants.map((x, k) => (k === i ? { ...x, phone: e.target.value } : x)))} placeholder="Téléphone" className={FIELD} aria-label="Téléphone" />
                  <select value={p.role} onChange={(e) => setParticipants(participants.map((x, k) => (k === i ? { ...x, role: e.target.value as ParticipantForm["role"] } : x)))} className={FIELD} aria-label="Rôle">
                    <option value="GUEST">Invité</option>
                    <option value="HOST">Hôte</option>
                    <option value="ORGANIZER">Organisateur</option>
                  </select>
                  <IconButton icon={Trash2} label="Retirer" tone="danger" onClick={() => setParticipants(participants.filter((_, k) => k !== i))} />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Série ── */}
        <Section title="Répétition" icon={Repeat}>
          <Switch checked={repeat} onChange={setRepeat} label="Répéter cette réservation" hint="Toutes les occurrences passent les mêmes règles. Si une seule échoue, aucune n'est créée." />
          {repeat && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Tous les">
                  <input type="number" min={1} value={interval} onChange={(e) => setIntervalValue(Math.max(1, Number(e.target.value) || 1))} className={FIELD} />
                </Field>
                <Field label="Unité">
                  <select value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)} className={FIELD}>
                    {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </Field>
                <Field label="Fin">
                  <select value={endBy} onChange={(e) => setEndBy(e.target.value as "count" | "date")} className={FIELD}>
                    <option value="count">Après un nombre d'occurrences</option>
                    <option value="date">À une date</option>
                  </select>
                </Field>
              </div>
              {endBy === "count" ? (
                <Field label="Occurrences (2 à 60)"><input type="number" min={2} max={60} value={occurrences} onChange={(e) => setOccurrences(Number(e.target.value) || 2)} className={`${FIELD} sm:w-40`} /></Field>
              ) : (
                <Field label="Dernière date" hint="60 occurrences au plus."><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`${FIELD} sm:w-56`} /></Field>
              )}
              <Field label="Dates à sauter">
                <div className="flex flex-wrap items-center gap-2">
                  {excluded.map((d) => (
                    <button key={d} type="button" onClick={() => setExcluded(excluded.filter((x) => x !== d))} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-200" title="Retirer">
                      {d} ×
                    </button>
                  ))}
                  <input type="date" value={excludeInput} onChange={(e) => setExcludeInput(e.target.value)} className={`${FIELD} w-44`} aria-label="Date à sauter" />
                  <ActionButton variant="ghost" disabled={!excludeInput || excluded.includes(excludeInput)} onClick={() => { setExcluded([...excluded, excludeInput].sort()); setExcludeInput(""); }}>Sauter</ActionButton>
                </div>
              </Field>
            </div>
          )}
        </Section>

        <Section title="Notes" icon={Clock}>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Informations complémentaires" className={`${FIELD} resize-none`} />
        </Section>

        {/* ── Disponibilité et devis ── */}
        <Section title="Disponibilité et devis" icon={Lock}>
          {!ready ? (
            <p className="text-sm text-gray-500">Choisissez le titulaire, la ressource et le créneau : la vérification se fait toute seule.</p>
          ) : availability.isError ? (
            <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{apiMessage(availability.error, "Vérification impossible")}</p>
          ) : !a || stale || availability.isFetching ? (
            <p className="text-sm text-gray-500">Vérification en cours…</p>
          ) : a.available ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <StatusChip tone="success">Disponible</StatusChip>
                <p className="text-sm text-gray-700">{formatDateTime(a.startedAt)} → {hm(a.endedAt)} · {formatDuration(a.durationMinutes)}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-gray-400">Montant estimé</p><p className="mt-1 text-xl font-black text-gray-950">{money(a.estimatedAmount, a.currency)}</p>{paymentMode === "SUBSCRIPTION" || paymentMode === "PASS" ? <p className="text-xs text-gray-500">Couvert par le droit</p> : null}</div>
                <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-gray-400">Prix unitaire</p><p className="mt-1 text-xl font-black text-gray-950">{money(a.unitPrice, a.currency)}</p><p className="text-xs text-gray-500">{label(UNIT_LABEL, a.bookingUnit)}</p></div>
                <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-gray-400">Places restantes</p><p className="mt-1 text-xl font-black text-gray-950">{a.remainingCapacity}</p></div>
              </div>
              {a.message && a.message !== "Disponible" && <p className="text-sm text-gray-600">{a.message}</p>}
              {repeat && <p className="text-xs text-gray-500">Ce devis vaut pour une occurrence. Chaque occurrence est contrôlée à la création.</p>}
              {paymentMode === "WALLET" && <p className="text-xs text-gray-500">Le solde du portefeuille n'est contrôlé qu'à la création.</p>}

              {!repeat && (
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  {hold ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Créneau retenu <span className="font-mono text-xs font-normal text-gray-500">{hold.holdNumber}</span></p>
                        <p className="text-xs text-gray-500">Jusqu'à {formatDateTime(hold.expiresAt)}. Il sera converti en réservation.</p>
                      </div>
                      <ActionButton variant="ghost" pending={dropHold.isPending} onClick={() => dropHold.mutate()}>Libérer</ActionButton>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-gray-600">Besoin de temps ? Retenez le créneau pendant la saisie.</p>
                      <div className="flex items-center gap-2">
                        <select value={ttl} onChange={(e) => setTtl(Number(e.target.value))} className={`${FIELD} w-32`} aria-label="Durée de l'option">
                          {TTLS.map((t) => <option key={t} value={t}>{t} min</option>)}
                        </select>
                        <ActionButton variant="ghost" icon={Lock} pending={takeHold.isPending} onClick={() => takeHold.mutate()}>Retenir</ActionButton>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-700">Indisponible</p>
                {a.message && <p className="mt-1 text-sm text-red-700">{a.message}</p>}
              </div>
              {(a.occupiedRanges ?? []).length > 0 && (
                <ul className="space-y-1 text-sm text-gray-700">
                  {a.occupiedRanges!.map((r, i) => (
                    <li key={i}>
                      Occupé de {hm(r.startedAt)} à {hm(r.endedAt)}
                      <span className="text-gray-500"> · {r.reason === "BOOKED" ? "réservé" : "fermé ou en option"}{r.bookingNumbers?.length ? ` (${r.bookingNumbers.join(", ")})` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
              {suggestions.isLoading ? (
                <p className="text-sm text-gray-500">Recherche d'alternatives…</p>
              ) : (suggestions.data ?? []).length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-800">Créneaux libres proches</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {suggestions.data!.map((s, i) => (
                      <button key={i} type="button" onClick={() => applySuggestion(s)} className="rounded-2xl bg-white p-3 text-left shadow-sm transition hover:bg-gray-50">
                        <p className="text-sm font-semibold text-gray-900">{formatDateTime(s.startedAt)} → {hm(s.endedAt)}</p>
                        <p className="text-xs text-gray-500">{s.resourceName} · {money(s.estimatedAmount, "XAF")}{s.reason === "same_day_slot" ? " · même jour" : s.reason === "later_day_slot" ? " · un autre jour" : ""}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Aucun créneau libre de même durée à proximité.</p>
              )}
            </div>
          )}
        </Section>

        <ErrorLines message={error} lines={errors} />
        {repeat && error && <p className="text-xs text-gray-500">Une occurrence échoue : ajoutez sa date dans « Dates à sauter » puis relancez.</p>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ActionButton variant="ghost" onClick={() => navigate("/bookings")} disabled={create.isPending}>Annuler</ActionButton>
          <ActionButton type="submit" pending={create.isPending} disabled={!canSubmit}>
            {repeat ? "Créer la série" : "Créer la réservation"}
          </ActionButton>
        </div>
      </form>
    </DetailShell>
  );
};

export default BookingCreatePage;
