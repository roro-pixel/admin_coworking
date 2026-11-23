import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  History,
  ListChecks,
  LogIn,
  LogOut,
  Pencil,
  Play,
  Plus,
  Repeat,
  Send,
  Tag as TagIcon,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { BookingResponse, BookingStatusChangeRequest, BookingChangePreview } from "../../services/booking.service";
import {
  ActionButton,
  Detail,
  EmptyState,
  ErrorBlock,
  Field,
  IconButton,
  ItemRow,
  PageHeader,
  PanelForm,
  Section,
  StatusChip,
  Tabs,
  Tag,
} from "../subscription/kit";
import type { TabItem } from "../subscription/kit";
import { FIELD, apiMessage, formatDateTime } from "../subscription/kitUtils";
import { DetailsSkeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { DetailShell, formatDuration, toLocalInput, withSeconds } from "../resources/resKit";
import { ResourceAutocomplete } from "../resources/ResourceAutocomplete";
import { useAuth } from "../../contexts/AuthContext";
import {
  BookingStatusChip,
  CAN,
  CHANNEL_LABEL,
  ErrorLines,
  LINE_LABEL,
  OwnerPicker,
  PARTICIPANT_STATUS_LABEL,
  PAYMENT_MODE_LABEL,
  PaymentChip,
  ROLE_LABEL,
  ReasonSelect,
  UNIT_LABEL,
  errorReason,
  errorStatus,
  errorText,
  label,
  money,
  refList,
  useBookingReference,
} from "./bookingKit";
import type { LookupItem } from "../../services/booking.service";

type Tab = "summary" | "lines" | "people" | "ops" | "series" | "history";
type Panel =
  | null
  | "confirm"
  | "approve"
  | "reject"
  | "start"
  | "complete"
  | "cancel"
  | "noShow"
  | "reschedule"
  | "resource"
  | "transfer"
  | "price"
  | "details"
  | "guest"
  | "service"
  | "promo"
  | "report";

const STATUS_PANELS: Record<string, { title: string; submit: string; required: boolean; list?: string; success: string }> = {
  confirm: { title: "Confirmer la réservation", submit: "Confirmer", required: false, success: "Réservation confirmée" },
  approve: { title: "Approuver la réservation", submit: "Approuver", required: false, success: "Réservation approuvée" },
  reject: { title: "Refuser la réservation", submit: "Refuser", required: true, list: "BOOKING_REJECT_REASON", success: "Réservation refusée" },
  start: { title: "Démarrer la réservation", submit: "Démarrer", required: false, success: "Réservation démarrée" },
  complete: { title: "Clôturer la réservation", submit: "Clôturer", required: false, success: "Réservation clôturée" },
  cancel: { title: "Annuler la réservation", submit: "Annuler la réservation", required: true, list: "BOOKING_CANCEL_REASON", success: "Réservation annulée" },
  noShow: { title: "Déclarer une absence", submit: "Déclarer l'absence", required: false, list: "BOOKING_CANCEL_REASON", success: "Absence enregistrée" },
};

const STATUS_CALL = {
  confirm: bookingService.confirmBooking,
  approve: bookingService.approveBooking,
  reject: bookingService.rejectBooking,
  start: bookingService.startBooking,
  complete: bookingService.completeBooking,
  cancel: bookingService.cancelBooking,
  noShow: bookingService.noShowBooking,
} as const;

const toIsoLocal = (v: string) => withSeconds(v);

export const BookingDetailPage: React.FC = () => {
  const { bookingNumber } = useParams<{ bookingNumber: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("BOOKING:UPDATE");
  const canCreate = hasPermission("BOOKING:CREATE");
  const canCancel = hasPermission("BOOKING:CANCEL");
  const canCheckIn = hasPermission("BOOKING:CHECKIN");

  const [tab, setTab] = useState<Tab>("summary");
  const [panel, setPanel] = useState<Panel>(null);
  const { data: reference } = useBookingReference();

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ["booking", bookingNumber],
    queryFn: () => bookingService.getBooking(bookingNumber!),
    enabled: !!bookingNumber,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["booking", bookingNumber] });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    queryClient.invalidateQueries({ queryKey: ["booking-lines", bookingNumber] });
    queryClient.invalidateQueries({ queryKey: ["booking-history", bookingNumber] });
    queryClient.invalidateQueries({ queryKey: ["booking-events", bookingNumber] });
    queryClient.invalidateQueries({ queryKey: ["booking-series"] });
  };
  const done = (message: string) => {
    toast.success(message);
    setPanel(null);
    refresh();
  };

  if (isLoading) {
    return (
      <DetailShell>
        <DetailsSkeleton />
      </DetailShell>
    );
  }
  if (isError || !booking) {
    return (
      <DetailShell>
        <ErrorBlock message="Réservation introuvable." onRetry={() => refetch()} />
      </DetailShell>
    );
  }

  const b = booking;
  const n = b.bookingNumber;
  const st = b.status;
  const live = (CAN.live as readonly string[]).includes(st);
  const is = (list: readonly string[]) => list.includes(st);

  const tabs: TabItem<Tab>[] = [
    { id: "summary", label: "Résumé", icon: ClipboardCheck },
    { id: "lines", label: "Lignes et extras", icon: ListChecks },
    { id: "people", label: "Participants", icon: Users, count: b.participants?.length || undefined },
    { id: "ops", label: "Exploitation", icon: ClipboardCheck },
    ...(b.recurrenceGroupNumber ? [{ id: "series" as Tab, label: "Série", icon: Repeat }] : []),
    { id: "history", label: "Historique", icon: History },
  ];

  const actions = (
    <div className="flex flex-wrap gap-2">
      {canUpdate && is(CAN.confirm) && <ActionButton icon={CheckCircle2} onClick={() => setPanel("confirm")}>Confirmer</ActionButton>}
      {canUpdate && is(CAN.approve) && <ActionButton icon={CheckCircle2} onClick={() => setPanel("approve")}>Approuver</ActionButton>}
      {canCancel && is(CAN.reject) && <ActionButton variant="danger" icon={XCircle} onClick={() => setPanel("reject")}>Refuser</ActionButton>}
      {canCheckIn && is(CAN.checkIn) && <CheckInButton b={b} onDone={refresh} />}
      {canCheckIn && is(CAN.checkOut) && <CheckOutButton n={n} onDone={refresh} />}
      {canUpdate && is(CAN.start) && <ActionButton variant="ghost" icon={Play} onClick={() => setPanel("start")}>Démarrer</ActionButton>}
      {canUpdate && is(CAN.complete) && <ActionButton variant="ghost" icon={CheckCircle2} onClick={() => setPanel("complete")}>Clôturer</ActionButton>}
      {canCancel && is(CAN.noShow) && <ActionButton variant="ghost" icon={XCircle} onClick={() => setPanel("noShow")}>Absence</ActionButton>}
      {canUpdate && is(CAN.reschedule) && <ActionButton variant="ghost" icon={CalendarClock} onClick={() => setPanel("reschedule")}>Déplacer</ActionButton>}
      {canUpdate && is(CAN.changeResource) && <ActionButton variant="ghost" icon={ArrowRightLeft} onClick={() => setPanel("resource")}>Changer de ressource</ActionButton>}
      {canUpdate && is(CAN.transfer) && !["ENTITLEMENT", "WALLET"].includes(b.paymentMode) && (
        <ActionButton variant="ghost" icon={Send} onClick={() => setPanel("transfer")}>Transférer</ActionButton>
      )}
      {canCancel && is(CAN.cancel) && <ActionButton variant="danger" icon={Trash2} onClick={() => setPanel("cancel")}>Annuler</ActionButton>}
    </div>
  );

  const badges = (
    <div className="flex flex-wrap items-center gap-2">
      <BookingStatusChip status={st} />
      {b.paymentStatus && <PaymentChip status={b.paymentStatus} text={b.paymentStatusLabel} />}
      {!!b.modificationCount && b.modificationCount > 0 && (
        <Tag>Modifiée {b.modificationCount} fois</Tag>
      )}
      {b.payOnSite && <StatusChip tone="warn">À régler sur place</StatusChip>}
      {b.attendanceAnswer === "CONFIRMED" && <StatusChip tone="success">Venue confirmée</StatusChip>}
      {b.attendanceAnswer === "DECLINED" && <StatusChip tone="danger">Ne viendra pas</StatusChip>}
    </div>
  );

  return (
    <DetailShell>
      <PageHeader
        title={n}
        subtitle={`${b.resourceName} · ${formatDateTime(b.startedAt)} → ${String(b.endedAt).slice(11, 16)}`}
        onBack={() => navigate("/bookings")}
        backLabel="Réservations"
      />
      <div className="-mt-3 mb-5 space-y-4">
        {badges}
        {actions}
      </div>

      <div className="mt-5 space-y-4">
        {panel && panel in STATUS_PANELS && (
          <StatusPanel
            kind={panel as keyof typeof STATUS_PANELS}
            n={n}
            reasons={refList(reference, STATUS_PANELS[panel].list ?? "")}
            onDone={(m) => done(m)}
            onCancel={() => setPanel(null)}
          />
        )}
        {panel === "reschedule" && <ReschedulePanel b={b} onDone={done} onCancel={() => setPanel(null)} />}
        {panel === "resource" && <ChangeResourcePanel b={b} onDone={done} onCancel={() => setPanel(null)} />}
        {panel === "transfer" && <TransferPanel n={n} onDone={done} onCancel={() => setPanel(null)} />}

        <Tabs items={tabs} active={tab} onChange={setTab} variant="soft" />

        {tab === "summary" && (
          <SummaryTab b={b} panel={panel} setPanel={setPanel} canUpdate={canUpdate} canCreate={canCreate} live={live} onDone={done} onRefresh={refresh} reference={reference} />
        )}
        {tab === "lines" && <LinesTab b={b} canCreate={canCreate} live={live} onDone={done} />}
        {tab === "people" && <PeopleTab b={b} canCreate={canCreate} canUpdate={canUpdate} canCheckIn={canCheckIn} live={live} onDone={done} onRefresh={refresh} />}
        {tab === "ops" && <OpsTab b={b} canCreate={canCreate} panel={panel} setPanel={setPanel} onDone={done} />}
        {tab === "series" && b.recurrenceGroupNumber && <SeriesTab group={b.recurrenceGroupNumber} current={n} canUpdate={canUpdate} canCancel={canCancel} onRefresh={refresh} />}
        {tab === "history" && <HistoryTab n={n} />}
      </div>
    </DetailShell>
  );
};

/* ───────────── Boutons d'accueil ───────────── */

const CheckInButton: React.FC<{ b: BookingResponse; onDone: () => void }> = ({ b, onDone }) => {
  const [early, setEarly] = useState(false);
  const mutation = useMutation({
    mutationFn: (useEarly: boolean) => (useEarly ? bookingService.earlyCheckIn(b.bookingNumber) : bookingService.checkIn(b.bookingNumber)),
    onSuccess: () => {
      toast.success("Arrivée enregistrée");
      setEarly(false);
      onDone();
    },
    onError: (e) => {
      if (errorReason(e) === "CHECKIN_OUTSIDE_WINDOW") {
        toast.confirm({
          tone: "primary",
          message: "Hors de la fenêtre d'arrivée",
          detail: errorText(e, "L'arrivée est en dehors de la fenêtre prévue. Enregistrer l'arrivée anticipée ?"),
          confirmLabel: "Arrivée anticipée",
          pendingLabel: "Enregistrement…",
          successMessage: "Arrivée enregistrée",
          errorMessage: "Arrivée impossible",
          onConfirm: async () => {
            await bookingService.earlyCheckIn(b.bookingNumber);
            onDone();
          },
        });
      } else toast.error(apiMessage(e, "Arrivée impossible"));
      setEarly(false);
    },
  });
  void early;
  return (
    <ActionButton icon={LogIn} pending={mutation.isPending} onClick={() => mutation.mutate(false)}>
      Arrivée
    </ActionButton>
  );
};

const CheckOutButton: React.FC<{ n: string; onDone: () => void }> = ({ n, onDone }) => {
  const mutation = useMutation({
    mutationFn: () => bookingService.checkOut(n),
    onSuccess: () => {
      toast.success("Départ enregistré");
      onDone();
    },
    onError: (e) => toast.error(apiMessage(e, "Départ impossible")),
  });
  return (
    <ActionButton icon={LogOut} pending={mutation.isPending} onClick={() => mutation.mutate()}>
      Départ
    </ActionButton>
  );
};

/* ───────────── Changements de statut ───────────── */

const StatusPanel: React.FC<{
  kind: keyof typeof STATUS_PANELS;
  n: string;
  reasons: ReturnType<typeof refList>;
  onDone: (message: string) => void;
  onCancel: () => void;
}> = ({ kind, n, reasons, onDone, onCancel }) => {
  const cfg = STATUS_PANELS[kind];
  const [code, setCode] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const hasList = !!cfg.list && reasons.length > 0;
  const needsText = !hasList || code === "OTHER";
  const invalid = cfg.required && (hasList ? !code || (code === "OTHER" && !text.trim()) : !text.trim());

  const mutation = useMutation({
    mutationFn: () => {
      const body: BookingStatusChangeRequest = {};
      if (code) body.reasonCode = code;
      if (text.trim()) body.reasonText = text.trim();
      return STATUS_CALL[kind as keyof typeof STATUS_CALL](n, body);
    },
    onSuccess: () => onDone(cfg.success),
    onError: (e) => {
      const reason = errorReason(e);
      if (reason === "PREPAYMENT_REQUIRED" || reason === "COMPANY_BUDGET_EXCEEDED") {
        setError(`${errorText(e, "Action refusée")}`);
      } else setError(apiMessage(e, "Action impossible"));
    },
  });

  const showFree = !cfg.list || needsText;
  return (
    <PanelForm
      title={cfg.title}
      pending={mutation.isPending}
      submitLabel={cfg.submit}
      submitDisabled={invalid}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      {cfg.list ? (
        <ReasonSelect values={reasons} code={code} text={text} onCode={setCode} onText={setText} required={cfg.required} />
      ) : (
        showFree && (
          <Field label="Note (facultatif)">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className={`${FIELD} resize-none`} />
          </Field>
        )
      )}
    </PanelForm>
  );
};

/* ───────────── Déplacer, changer de ressource, transférer ───────────── */

const PreviewLine: React.FC<{ p: BookingChangePreview }> = ({ p }) => (
  <div className="rounded-2xl bg-gray-50 p-3 text-sm">
    <p className="font-semibold text-gray-900">
      {p.change === "SAME" ? "Le prix ne change pas" : p.change === "INCREASE" ? "Le prix augmente" : "Le prix baisse"}
    </p>
    <p className="text-gray-600">
      {money(p.currentAmount, p.currency)} → {money(p.newAmount, p.currency)}
      {p.difference ? ` (${p.difference > 0 ? "+" : ""}${money(p.difference, p.currency)})` : ""}
    </p>
    {p.invoiced && <p className="mt-1 text-xs text-gray-500">La facture déjà émise sera ajustée automatiquement.</p>}
  </div>
);

/** Rejoue l'appel avec acceptPriceChange après confirmation quand le serveur l'exige (409). */
function useConfirmedChange<T>(run: (accept: boolean) => Promise<T>, onDone: (m: string) => void, success: string, setError: (m: string) => void) {
  return useMutation({
    mutationFn: () => run(false),
    onSuccess: () => onDone(success),
    onError: (e) => {
      if (errorStatus(e) === 409 && errorReason(e) === "PRICE_INCREASE_CONFIRMATION_REQUIRED") {
        toast.confirm({
          tone: "primary",
          message: "Le prix augmente",
          detail: errorText(e, "Cette modification augmente le prix. Confirmer ?"),
          confirmLabel: "Accepter le nouveau prix",
          pendingLabel: "Enregistrement…",
          successMessage: success,
          errorMessage: "Modification impossible",
          onConfirm: async () => {
            await run(true);
            onDone(success);
          },
        });
      } else setError(apiMessage(e, "Modification impossible"));
    },
  });
}

const ReschedulePanel: React.FC<{ b: BookingResponse; onDone: (m: string) => void; onCancel: () => void }> = ({ b, onDone, onCancel }) => {
  const [start, setStart] = useState(toLocalInput(b.startedAt));
  const [end, setEnd] = useState(toLocalInput(b.endedAt));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ready = !!start && !!end && end > start;
  const changed = start !== toLocalInput(b.startedAt) || end !== toLocalInput(b.endedAt);

  const preview = useQuery({
    queryKey: ["booking-reschedule-preview", b.bookingNumber, start, end],
    queryFn: () => bookingService.previewReschedule(b.bookingNumber, toIsoLocal(start), toIsoLocal(end)),
    enabled: ready && changed,
    retry: false,
  });
  const mutation = useConfirmedChange(
    (accept) =>
      bookingService.rescheduleBooking(b.bookingNumber, {
        newStartedAt: toIsoLocal(start),
        newEndedAt: toIsoLocal(end),
        note: note.trim() || undefined,
        acceptPriceChange: accept || undefined,
      }),
    onDone,
    "Réservation déplacée",
    setError,
  );

  return (
    <PanelForm
      title="Déplacer la réservation"
      pending={mutation.isPending}
      submitLabel="Déplacer"
      submitDisabled={!ready || !changed}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Début" required>
          <input type="datetime-local" step={900} value={start} onChange={(e) => setStart(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Fin" required>
          <input type="datetime-local" step={900} value={end} onChange={(e) => setEnd(e.target.value)} className={FIELD} />
        </Field>
      </div>
      {preview.data && <PreviewLine p={preview.data} />}
      {preview.isError && <p className="text-sm text-red-600">{apiMessage(preview.error, "Créneau indisponible")}</p>}
      <Field label="Note (facultatif)">
        <input value={note} onChange={(e) => setNote(e.target.value)} className={FIELD} />
      </Field>
    </PanelForm>
  );
};

const ChangeResourcePanel: React.FC<{ b: BookingResponse; onDone: (m: string) => void; onCancel: () => void }> = ({ b, onDone, onCancel }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const preview = useQuery({
    queryKey: ["booking-resource-preview", b.bookingNumber, code],
    queryFn: () => bookingService.previewChangeResource(b.bookingNumber, code),
    enabled: !!code && code !== b.resourceCode,
    retry: false,
  });
  const mutation = useConfirmedChange(
    (accept) => bookingService.changeBookingResource(b.bookingNumber, { newResourceCode: code, acceptPriceChange: accept || undefined }),
    onDone,
    "Ressource changée",
    setError,
  );
  return (
    <PanelForm
      title="Changer de ressource"
      pending={mutation.isPending}
      submitLabel="Changer"
      submitDisabled={!code || code === b.resourceCode}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <p className="text-sm text-gray-500">Actuellement : {b.resourceName} ({b.resourceCode}). Le créneau reste le même.</p>
      <Field label="Nouvelle ressource" required>
        <ResourceAutocomplete selectedCode={code} onSelect={(r) => setCode(r?.code ?? "")} />
      </Field>
      {preview.data && <PreviewLine p={preview.data} />}
      {preview.isError && <p className="text-sm text-red-600">{apiMessage(preview.error, "Ressource indisponible sur ce créneau")}</p>}
    </PanelForm>
  );
};

const TransferPanel: React.FC<{ n: string; onDone: (m: string) => void; onCancel: () => void }> = ({ n, onDone, onCancel }) => {
  const [owner, setOwner] = useState<LookupItem | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => bookingService.transferBooking(n, { newOwnerType: owner!.type, newOwnerCode: owner!.code, note: note.trim() || undefined }),
    onSuccess: () => onDone("Réservation transférée"),
    onError: (e) => setError(apiMessage(e, "Transfert impossible")),
  });
  return (
    <PanelForm
      title="Transférer à un autre titulaire"
      pending={mutation.isPending}
      submitLabel="Transférer"
      submitDisabled={!owner}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="Nouveau titulaire" required>
        <OwnerPicker value={owner} onChange={setOwner} />
      </Field>
      <Field label="Note (facultatif)">
        <input value={note} onChange={(e) => setNote(e.target.value)} className={FIELD} />
      </Field>
    </PanelForm>
  );
};

/* ───────────── Résumé ───────────── */

interface TabProps {
  b: BookingResponse;
  panel: Panel;
  setPanel: (p: Panel) => void;
  onDone: (m: string) => void;
}

const SummaryTab: React.FC<
  TabProps & { canUpdate: boolean; canCreate: boolean; live: boolean; onRefresh: () => void; reference: ReturnType<typeof useBookingReference>["data"] }
> = ({ b, panel, setPanel, canUpdate, canCreate, live, onDone, onRefresh, reference }) => {
  const n = b.bookingNumber;
  const extend = useMutation({
    mutationFn: (minutes: number) => bookingService.extendBooking(n, minutes),
    onSuccess: () => {
      toast.success("Réservation prolongée");
      onRefresh();
    },
    onError: (e, minutes) => {
      if (errorStatus(e) === 409 && errorReason(e) === "PRICE_INCREASE_CONFIRMATION_REQUIRED") {
        toast.confirm({
          message: "Le prix augmente",
          detail: errorText(e, "Cette prolongation augmente le prix. Confirmer ?"),
          confirmLabel: "Prolonger",
          successMessage: "Réservation prolongée",
          errorMessage: "Prolongation impossible",
          onConfirm: async () => {
            await bookingService.extendBooking(n, minutes, true);
            onRefresh();
          },
        });
      } else toast.error(apiMessage(e, "Prolongation impossible"));
    },
  });
  const reminder = useMutation({
    mutationFn: () => bookingService.queueReminder(n, 30),
    onSuccess: () => toast.success("Rappel programmé"),
    onError: (e) => toast.error(apiMessage(e, "Rappel impossible")),
  });

  const canAdjust = canCreate && live && !b.priceAdjustmentStatus && !b.priceAdjustmentAmount && !b.originalAmount;

  return (
    <div className="space-y-4">
      <Section title="Réservation" icon={ClipboardCheck}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail label="Ressource">
            <Link className="font-semibold text-[color:var(--logo-pink-dark)] hover:underline" to={`/resources/${b.resourceCode}`}>
              {b.resourceName}
            </Link>{" "}
            <span className="text-gray-500">({b.resourceCode})</span>
          </Detail>
          <Detail label="Titulaire">
            {b.ownerName || b.contactName || b.ownerCode}
            <span className="text-gray-500"> · {b.ownerType}</span>
          </Detail>
          <Detail label="Début">{formatDateTime(b.startedAt)}</Detail>
          <Detail label="Fin">{formatDateTime(b.endedAt)}</Detail>
          <Detail label="Durée">{formatDuration(b.durationMinutes)}</Detail>
          <Detail label="Quantité">{b.seatsLabel || b.quantity}</Detail>
          <Detail label="Unité">{label(UNIT_LABEL, b.bookingUnit)}</Detail>
          <Detail label="Canal">{label(CHANNEL_LABEL, b.channel)}</Detail>
          <Detail label="Contact">{[b.contactName, b.contactEmail, b.contactPhone].filter(Boolean).join(" · ")}</Detail>
          <Detail label="Créée le">{formatDateTime(b.createdAt)}{b.createdBy ? ` par ${b.createdBy}` : ""}</Detail>
          {b.billingCompanyCode && <Detail label="Entreprise payeuse" mono>{b.billingCompanyCode}</Detail>}
          {b.policyOverrideBy && <Detail label="Dérogation de préavis">Accordée par {b.policyOverrideBy}</Detail>}
          {b.virtualMeetingUrl && (
            <Detail label="Visio" wide>
              <a href={b.virtualMeetingUrl} target="_blank" rel="noreferrer" className="break-all text-[color:var(--logo-pink-dark)] hover:underline">
                {b.virtualMeetingUrl}
              </a>
            </Detail>
          )}
          {b.notes && <Detail label="Notes" wide>{b.notes}</Detail>}
          {b.cancellationReason && <Detail label="Motif d'annulation" wide>{b.cancellationReason}</Detail>}
          {b.rejectionReason && <Detail label="Motif de refus" wide>{b.rejectionReason}</Detail>}
        </div>
        {live && canCreate && (b.status === "CONFIRMED" || b.status === "IN_PROGRESS") && (
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton variant="ghost" icon={Clock} pending={extend.isPending} onClick={() => extend.mutate(30)}>+30 min</ActionButton>
            <ActionButton variant="ghost" icon={Clock} pending={extend.isPending} onClick={() => extend.mutate(60)}>+1 h</ActionButton>
            <ActionButton variant="ghost" icon={Bell} pending={reminder.isPending} onClick={() => reminder.mutate()}>Rappel 30 min avant</ActionButton>
          </div>
        )}
      </Section>

      <Section title="Montants" icon={ListChecks}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail label="Mode de paiement">{label(PAYMENT_MODE_LABEL, b.paymentMode)}</Detail>
          <Detail label="Prix unitaire">{money(b.unitPrice, b.currency)}</Detail>
          <Detail label="Sous-total">{money(b.subtotalAmount, b.currency)}</Detail>
          {!!b.extrasAmount && <Detail label="Extras">{money(b.extrasAmount, b.currency)}</Detail>}
          <Detail label="Total">{money(b.grandTotal ?? b.totalAmount, b.currency)}</Detail>
          {!!b.depositAmount && (
            <Detail label="Caution">{money(b.depositAmount, b.currency)}{b.depositPaidAt ? ` · versée le ${formatDateTime(b.depositPaidAt)}` : ""}</Detail>
          )}
          {b.paymentDueAt && <Detail label="À payer avant">{formatDateTime(b.paymentDueAt)}</Detail>}
          {b.paidAt && <Detail label="Payée le">{formatDateTime(b.paidAt)}</Detail>}
          {b.subscriptionNumber && <Detail label="Abonnement" mono>{b.subscriptionNumber}</Detail>}
          {b.passNumber && <Detail label="Pass" mono>{b.passNumber}</Detail>}
          {!!b.companyCoveredMinutes && <Detail label="Minutes prises en charge par l'entreprise">{b.companyCoveredMinutes}</Detail>}
          {b.monthlyStatement && <Detail label="Facturation">Relevé mensuel de l'entreprise</Detail>}
          {b.invoiceNumber && (
            <Detail label="Facture">
              <Link className="font-mono font-semibold text-[color:var(--logo-pink-dark)] hover:underline" to={`/billing/documents/${b.invoiceNumber}`}>
                {b.invoiceNumber}
              </Link>
            </Detail>
          )}
          {b.batchNumber && (
            <Detail label="Lot">
              <Link className="font-mono font-semibold text-[color:var(--logo-pink-dark)] hover:underline" to={`/bookings?tab=batches&batch=${b.batchNumber}`}>
                {b.batchNumber}
              </Link>
            </Detail>
          )}
          {b.leadNumber && <Detail label="Prospect" mono>{b.leadNumber}</Detail>}
          {b.callNote && <Detail label="Note d'appel" wide>{b.callNote}</Detail>}
        </div>
        {(b.originalAmount != null || b.priceAdjustmentReason || b.priceAdjustmentReasonCode) && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-semibold">Prix ajusté{b.priceAdjustmentBy ? ` par ${b.priceAdjustmentBy}` : ""}</p>
            <p>
              {b.originalAmount != null && <>Prix d'origine {money(b.originalAmount, b.currency)}. </>}
              {b.priceAdjustmentRate ? `Remise de ${b.priceAdjustmentRate} %. ` : ""}
              {b.priceAdjustmentReason || b.priceAdjustmentReasonCode}
            </p>
            {b.priceAdjustmentStatus && (
              <p className="mt-1 text-xs">
                {b.priceAdjustmentStatus === "PENDING" ? "Demande en attente d'approbation" : b.priceAdjustmentStatus === "APPLIED" ? "Appliquée" : b.priceAdjustmentStatus === "REJECTED" ? "Refusée, prix calculé conservé" : b.priceAdjustmentStatus}
                {b.priceAdjustmentApprovalNumber && (
                  <>
                    {" · "}
                    <Link className="font-mono font-semibold underline" to={`/bookings/approvals/${encodeURIComponent(b.priceAdjustmentApprovalNumber)}`}>{b.priceAdjustmentApprovalNumber}</Link>
                  </>
                )}
              </p>
            )}
          </div>
        )}
        {canAdjust && (
          <div className="mt-4">
            <ActionButton variant="ghost" icon={Pencil} onClick={() => setPanel(panel === "price" ? null : "price")}>Ajuster le prix</ActionButton>
          </div>
        )}
      </Section>

      {panel === "price" && <PricePanel n={n} reasons={refList(reference, "BOOKING_PRICE_ADJUSTMENT_REASON")} onDone={onDone} onCancel={() => setPanel(null)} />}

      <Section
        title="Détails de la réservation"
        icon={TagIcon}
        action={canUpdate && live ? <IconButton icon={Pencil} label="Modifier" onClick={() => setPanel(panel === "details" ? null : "details")} /> : undefined}
      >
        {panel === "details" ? (
          <DetailsPanel b={b} reference={reference} onDone={onDone} onCancel={() => setPanel(null)} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Detail label="Disposition de la salle">{b.roomLayout ? label(Object.fromEntries(refList(reference, "BOOKING_ROOM_LAYOUT").map((v) => [v.code, v.label])), b.roomLayout) : ""}</Detail>
            <Detail label="Étiquettes">
              <span className="flex flex-wrap gap-1.5">
                {(b.tags ?? []).map((t) => (
                  <Tag key={t}>{refList(reference, "BOOKING_TAG").find((v) => v.code === t)?.label ?? t}</Tag>
                ))}
              </span>
            </Detail>
            <Detail label="Demandes particulières" wide>{b.specialRequests}</Detail>
            <Detail label="Notes internes" wide>{b.internalNotes}</Detail>
          </div>
        )}
      </Section>

      {b.checkInQrValue && live && (
        <Section title="Code d'arrivée" description="Le client le présente à l'accueil ou le scanne sur place.">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <img src={b.checkInQrValue} alt="QR code d'arrivée" className="h-40 w-40 rounded-2xl bg-white p-2 shadow-sm" />
            {b.checkInToken && <p className="break-all font-mono text-sm text-gray-700">{b.checkInToken}</p>}
          </div>
        </Section>
      )}

      <Section title="Suivi">
        <div className="grid gap-4 sm:grid-cols-2">
          {b.confirmedAt && <Detail label="Confirmée le">{formatDateTime(b.confirmedAt)}</Detail>}
          {b.approvedAt && <Detail label="Approuvée">{formatDateTime(b.approvedAt)}{b.approvedBy ? ` par ${b.approvedBy}` : ""}</Detail>}
          {b.rejectedAt && <Detail label="Refusée">{formatDateTime(b.rejectedAt)}{b.rejectedBy ? ` par ${b.rejectedBy}` : ""}</Detail>}
          {b.checkedInAt && <Detail label="Arrivée">{formatDateTime(b.checkedInAt)}</Detail>}
          {b.checkedOutAt && <Detail label="Départ">{formatDateTime(b.checkedOutAt)}</Detail>}
          {b.releasedEarlyAt && <Detail label="Libérée en avance">{formatDateTime(b.releasedEarlyAt)}</Detail>}
          {b.completedAt && <Detail label="Clôturée le">{formatDateTime(b.completedAt)}</Detail>}
          {b.cancelledAt && <Detail label="Annulée le">{formatDateTime(b.cancelledAt)}</Detail>}
          {b.lastModifiedAt && <Detail label="Dernière modification">{formatDateTime(b.lastModifiedAt)}{b.lastModification ? ` · ${b.lastModification}` : ""}</Detail>}
          {b.csatScore != null && <Detail label="Avis du client">{b.csatScore} / 5{b.csatComment ? ` · ${b.csatComment}` : ""}</Detail>}
        </div>
      </Section>
    </div>
  );
};

const PricePanel: React.FC<{ n: string; reasons: ReturnType<typeof refList>; onDone: (m: string) => void; onCancel: () => void }> = ({ n, reasons, onDone, onCancel }) => {
  const [mode, setMode] = useState<"rate" | "amount">("rate");
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const num = Number(value);
  const mutation = useMutation({
    mutationFn: () =>
      bookingService.adjustPrice(n, {
        ...(mode === "rate" ? { discountRate: num } : { newAmount: num }),
        reasonCode: code || undefined,
        reasonText: text.trim() || undefined,
      }),
    onSuccess: () => onDone("Prix ajusté"),
    onError: (e) => setError(apiMessage(e, "Ajustement impossible")),
  });
  return (
    <PanelForm
      title="Ajuster le prix"
      pending={mutation.isPending}
      submitLabel="Appliquer"
      submitDisabled={!value || !(num >= 0) || !code || (code === "OTHER" && !text.trim())}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type d'ajustement">
          <select value={mode} onChange={(e) => setMode(e.target.value as "rate" | "amount")} className={FIELD}>
            <option value="rate">Remise en pourcentage</option>
            <option value="amount">Nouveau montant</option>
          </select>
        </Field>
        <Field label={mode === "rate" ? "Remise (%)" : "Nouveau montant"} required>
          <input type="number" min={0} step="any" value={value} onChange={(e) => setValue(e.target.value)} className={FIELD} />
        </Field>
      </div>
      <ReasonSelect values={reasons} code={code} text={text} onCode={setCode} onText={setText} required />
    </PanelForm>
  );
};

const DetailsPanel: React.FC<{ b: BookingResponse; reference: ReturnType<typeof useBookingReference>["data"]; onDone: (m: string) => void; onCancel: () => void }> = ({ b, reference, onDone, onCancel }) => {
  const [layout, setLayout] = useState(b.roomLayout ?? "");
  const [requests, setRequests] = useState(b.specialRequests ?? "");
  const [internal, setInternal] = useState(b.internalNotes ?? "");
  const [tags, setTags] = useState<string[]>(b.tags ?? []);
  const [error, setError] = useState<string | null>(null);
  const layouts = refList(reference, "BOOKING_ROOM_LAYOUT");
  const allTags = refList(reference, "BOOKING_TAG");
  const mutation = useMutation({
    mutationFn: () => bookingService.updateDetails(b.bookingNumber, { roomLayout: layout || undefined, specialRequests: requests, internalNotes: internal, tags }),
    onSuccess: () => onDone("Détails enregistrés"),
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  return (
    <PanelForm
      title="Modifier les détails"
      pending={mutation.isPending}
      submitLabel="Enregistrer"
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="Disposition de la salle">
        <select value={layout} onChange={(e) => setLayout(e.target.value)} className={FIELD}>
          <option value="">Non précisée</option>
          {layouts.map((v) => (
            <option key={v.code} value={v.code}>{v.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Demandes particulières">
        <textarea value={requests} onChange={(e) => setRequests(e.target.value)} rows={2} className={`${FIELD} resize-none`} />
      </Field>
      <Field label="Notes internes" hint="Visibles de l'équipe uniquement.">
        <textarea value={internal} onChange={(e) => setInternal(e.target.value)} rows={2} className={`${FIELD} resize-none`} />
      </Field>
      {allTags.length > 0 && (
        <Field label="Étiquettes">
          <div className="flex flex-wrap gap-2">
            {allTags.map((t) => {
              const on = tags.includes(t.code);
              return (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => setTags(on ? tags.filter((x) => x !== t.code) : [...tags, t.code])}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${on ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </Field>
      )}
    </PanelForm>
  );
};

/* ───────────── Lignes et extras ───────────── */

const LinesTab: React.FC<Pick<TabProps, "b" | "onDone"> & { canCreate: boolean; live: boolean }> = ({ b, canCreate, live, onDone }) => {
  const n = b.bookingNumber;
  const lines = useQuery({ queryKey: ["booking-lines", n], queryFn: () => bookingService.getLines(n) });
  const [kind, setKind] = useState<"service" | "amenity">("service");
  const [code, setCode] = useState("");
  const [qty, setQty] = useState(1);
  const [promo, setPromo] = useState("");
  const [extra, setExtra] = useState(1);
  const [waive, setWaive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () => (kind === "service" ? bookingService.addService(n, code.trim(), qty) : bookingService.addAmenity(n, code.trim(), qty)),
    onSuccess: () => onDone(kind === "service" ? "Service ajouté" : "Équipement ajouté"),
    onError: (e) => setError(apiMessage(e, "Ajout impossible")),
  });
  const promoMutation = useMutation({
    mutationFn: () => bookingService.applyPromoCode(n, promo.trim()),
    onSuccess: () => onDone("Code promo appliqué"),
    onError: (e) => setError(apiMessage(e, "Code promo refusé")),
  });
  const extraMutation = useMutation({
    mutationFn: () => bookingService.addExtraParticipants(n, extra, waive || undefined),
    onSuccess: () => onDone("Participants ajoutés"),
    onError: (e) => setError(apiMessage(e, "Ajout impossible")),
  });

  return (
    <div className="space-y-4">
      <Section title="Détail de la facturation" icon={ListChecks}>
        <div className="space-y-2">
          {(b.lines ?? []).map((l) => (
            <ItemRow key={String(l.id)} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{l.description}</p>
                <p className="text-xs text-gray-500">
                  {label(LINE_LABEL, l.lineType)} · {l.quantity} × {money(l.unitPrice, l.currency)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-gray-900">{money(l.amount, l.currency)}</p>
            </ItemRow>
          ))}
          {(b.lines ?? []).length === 0 && <p className="text-sm text-gray-500">Aucune ligne.</p>}
        </div>
      </Section>

      {(lines.data ?? []).length > 0 && (
        <Section title="Extras ajoutés">
          <div className="space-y-2">
            {(lines.data ?? []).map((l, i) => (
              <ItemRow key={i} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{l.description || l.code}</p>
                  <p className="text-xs text-gray-500">
                    {l.type}{l.quantity ? ` · ${l.quantity}` : ""}{l.billableNumber ? ` · ${l.billableNumber}` : ""}
                  </p>
                </div>
                {l.amount != null && <p className="text-sm font-bold text-gray-900">{money(l.amount, l.currency)}</p>}
              </ItemRow>
            ))}
          </div>
        </Section>
      )}

      {canCreate && live && (
        <Section title="Ajouter à la réservation" icon={Plus}>
          <ErrorLines message={error} />
          <div className="mt-3 grid gap-3 sm:grid-cols-[9rem_1fr_6rem_auto]">
            <select value={kind} onChange={(e) => setKind(e.target.value as "service" | "amenity")} className={FIELD} aria-label="Type">
              <option value="service">Service</option>
              <option value="amenity">Équipement</option>
            </select>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className={FIELD} aria-label="Code" />
            <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className={FIELD} aria-label="Quantité" />
            <ActionButton pending={add.isPending} disabled={!code.trim()} onClick={() => { setError(null); add.mutate(); }}>Ajouter</ActionButton>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Code promo" className={FIELD} aria-label="Code promo" />
            <ActionButton variant="ghost" pending={promoMutation.isPending} disabled={!promo.trim()} onClick={() => { setError(null); promoMutation.mutate(); }}>Appliquer</ActionButton>
          </div>
          <div className="mt-3 grid items-center gap-3 sm:grid-cols-[6rem_1fr_auto]">
            <input type="number" min={1} value={extra} onChange={(e) => setExtra(Math.max(1, Number(e.target.value)))} className={FIELD} aria-label="Participants en plus" />
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input type="checkbox" checked={waive} onChange={(e) => setWaive(e.target.checked)} className="h-4 w-4 accent-[color:var(--logo-pink-dark)]" />
              Offrir (sans supplément)
            </label>
            <ActionButton variant="ghost" icon={UserPlus} pending={extraMutation.isPending} onClick={() => { setError(null); extraMutation.mutate(); }}>Ajouter des participants</ActionButton>
          </div>
        </Section>
      )}
    </div>
  );
};

/* ───────────── Participants et invités ───────────── */

const PeopleTab: React.FC<Pick<TabProps, "b" | "onDone"> & { canCreate: boolean; canUpdate: boolean; canCheckIn: boolean; live: boolean; onRefresh: () => void }> = ({
  b,
  canCreate,
  canUpdate,
  canCheckIn,
  live,
  onDone,
  onRefresh,
}) => {
  const n = b.bookingNumber;
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "GUEST" });
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () => bookingService.addParticipant(n, { name: form.name.trim(), email: form.email.trim() || undefined, phone: form.phone.trim() || undefined, role: form.role as "GUEST" }),
    onSuccess: () => {
      setForm({ name: "", email: "", phone: "", role: "GUEST" });
      onDone("Participant ajouté");
    },
    onError: (e) => setError(apiMessage(e, "Ajout impossible")),
  });
  const invite = useMutation({
    mutationFn: (id: number | string | null) => (id == null ? bookingService.inviteAllParticipants(n) : bookingService.inviteParticipant(n, id)),
    onSuccess: () => toast.success("Invitation envoyée"),
    onError: (e) => toast.error(apiMessage(e, "Invitation impossible")),
  });
  const arrive = useMutation({
    mutationFn: (id: number | string) => bookingService.checkInParticipant(n, id),
    onSuccess: () => {
      toast.success("Arrivée de l'invité enregistrée");
      onRefresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Arrivée impossible")),
  });

  const people = b.participants ?? [];
  return (
    <div className="space-y-4">
      <Section
        title="Participants et invités"
        icon={Users}
        action={
          canCreate && live && people.some((p) => p.email) ? (
            <ActionButton variant="ghost" icon={Send} pending={invite.isPending} onClick={() => invite.mutate(null)}>Inviter tout le monde</ActionButton>
          ) : undefined
        }
      >
        {people.length === 0 ? (
          <EmptyState icon={Users} title="Aucun participant" hint="Ajoutez les invités pour leur envoyer l'invitation et suivre leur arrivée." />
        ) : (
          <div className="space-y-2">
            {people.map((p) => (
              <ItemRow key={String(p.id ?? p.name)} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {label(ROLE_LABEL, p.role)}
                    {p.status ? ` · ${label(PARTICIPANT_STATUS_LABEL, p.status)}` : ""}
                    {p.email ? ` · ${p.email}` : ""}
                    {p.checkedInAt ? ` · arrivé à ${String(p.checkedInAt).slice(11, 16)}` : ""}
                  </p>
                </div>
                {p.id != null && (
                  <div className="flex shrink-0 gap-1">
                    {canCheckIn && live && !p.checkedInAt && <IconButton icon={LogIn} label="Enregistrer l'arrivée" tone="success" pending={arrive.isPending} onClick={() => arrive.mutate(p.id!)} />}
                    {canCreate && live && p.email && <IconButton icon={Send} label="Inviter" onClick={() => invite.mutate(p.id!)} />}
                    {canUpdate && live && (
                      <IconButton
                        icon={Trash2}
                        label="Retirer"
                        tone="danger"
                        onClick={() =>
                          toast.confirm({
                            tone: "danger",
                            message: `Retirer ${p.name} ?`,
                            confirmLabel: "Retirer",
                            successMessage: "Participant retiré",
                            errorMessage: "Retrait impossible",
                            onConfirm: async () => {
                              await bookingService.removeParticipant(n, p.id!);
                              onRefresh();
                            },
                          })
                        }
                      />
                    )}
                  </div>
                )}
              </ItemRow>
            ))}
          </div>
        )}
      </Section>

      {canCreate && live && (
        <Section title="Ajouter un participant" icon={UserPlus}>
          <ErrorLines message={error} />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom" className={FIELD} aria-label="Nom" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={FIELD} aria-label="Rôle">
              <option value="GUEST">Invité</option>
              <option value="HOST">Hôte</option>
              <option value="ORGANIZER">Organisateur</option>
            </select>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Courriel" className={FIELD} aria-label="Courriel" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Téléphone" className={FIELD} aria-label="Téléphone" />
          </div>
          <div className="mt-3 flex justify-end">
            <ActionButton pending={add.isPending} disabled={!form.name.trim()} onClick={() => { setError(null); add.mutate(); }}>Ajouter</ActionButton>
          </div>
        </Section>
      )}
    </div>
  );
};

/* ───────────── Exploitation ───────────── */

const OpsTab: React.FC<TabProps & { canCreate: boolean }> = ({ b, canCreate, panel, setPanel, onDone }) => {
  const n = b.bookingNumber;
  const rules = useQuery({ queryKey: ["booking-usage-rules", n], queryFn: () => bookingService.getUsageRules(n), retry: false });
  const reports = useQuery({ queryKey: ["booking-end-reports", n], queryFn: () => bookingService.getEndReports(n), retry: false });
  const qc = useQueryClient();
  const accept = useMutation({
    mutationFn: () => bookingService.acceptUsageRules(n),
    onSuccess: () => {
      toast.success("Règles acceptées");
      qc.invalidateQueries({ queryKey: ["booking-usage-rules", n] });
    },
    onError: (e) => toast.error(apiMessage(e, "Acceptation impossible")),
  });

  const r = rules.data;
  return (
    <div className="space-y-4">
      <Section title="Règles d'usage" icon={ClipboardCheck}>
        {rules.isLoading ? (
          <p className="text-sm text-gray-500">Chargement…</p>
        ) : !r || !r.rules ? (
          <p className="text-sm text-gray-500">Aucune règle d'usage pour cette ressource.</p>
        ) : (
          <>
            <p className="whitespace-pre-line rounded-2xl bg-white p-4 text-sm text-gray-700 shadow-sm">{r.rules}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {r.acceptedAt && r.upToDate ? (
                <StatusChip tone="success">Acceptées le {formatDateTime(r.acceptedAt)}</StatusChip>
              ) : (
                <>
                  <StatusChip tone="warn">{r.acceptedAt ? "Règles modifiées depuis l'acceptation" : "Pas encore acceptées"}</StatusChip>
                  {canCreate && <ActionButton variant="ghost" pending={accept.isPending} onClick={() => accept.mutate()}>Enregistrer l'acceptation</ActionButton>}
                </>
              )}
            </div>
          </>
        )}
      </Section>

      <Section
        title="Rapport de fin d'utilisation"
        icon={ListChecks}
        action={canCreate ? <ActionButton variant="ghost" icon={Plus} onClick={() => setPanel(panel === "report" ? null : "report")}>Nouveau rapport</ActionButton> : undefined}
      >
        {panel === "report" && <EndReportPanel n={n} checklist={r?.endChecklist ?? []} onDone={(m) => { qc.invalidateQueries({ queryKey: ["booking-end-reports", n] }); onDone(m); }} onCancel={() => setPanel(null)} />}
        {(reports.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">Aucun rapport.</p>
        ) : (
          <div className="space-y-2">
            {(reports.data ?? []).map((rep, i) => (
              <ItemRow key={String(rep.id ?? i)}>
                <div className="flex items-center justify-between gap-3">
                  <StatusChip tone={rep.condition === "DAMAGED" ? "danger" : "success"}>{rep.condition === "DAMAGED" ? "Dégâts constatés" : "Rien à signaler"}</StatusChip>
                  <p className="text-xs text-gray-500">{formatDateTime(rep.createdAt)}{rep.reportedBy ? ` · ${rep.reportedBy}` : ""}</p>
                </div>
                {(rep.checklist ?? []).length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-sm text-gray-700">
                    {rep.checklist!.map((c, k) => (
                      <li key={k}>{c.done ? "✓" : "✗"} {c.label}</li>
                    ))}
                  </ul>
                )}
                {rep.notes && <p className="mt-2 text-sm text-gray-700">{rep.notes}</p>}
                {rep.incidentCode && <p className="mt-1 text-xs text-gray-500">Incident ouvert : <span className="font-mono">{rep.incidentCode}</span></p>}
              </ItemRow>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

const EndReportPanel: React.FC<{ n: string; checklist: string[]; onDone: (m: string) => void; onCancel: () => void }> = ({ n, checklist, onDone, onCancel }) => {
  const [condition, setCondition] = useState<"GOOD" | "DAMAGED">("GOOD");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      bookingService.createEndReport(n, {
        condition,
        checklist: checklist.length ? checklist.map((l) => ({ label: l, done: !!done[l] })) : undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => onDone("Rapport enregistré"),
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  return (
    <PanelForm
      title="Rapport de fin d'utilisation"
      pending={mutation.isPending}
      submitLabel="Enregistrer"
      submitDisabled={condition === "DAMAGED" && !notes.trim()}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="État des lieux">
        <select value={condition} onChange={(e) => setCondition(e.target.value as "GOOD" | "DAMAGED")} className={FIELD}>
          <option value="GOOD">Rien à signaler</option>
          <option value="DAMAGED">Dégâts constatés</option>
        </select>
      </Field>
      {checklist.length > 0 && (
        <div className="space-y-2">
          {checklist.map((l) => (
            <label key={l} className="flex items-center gap-3 text-sm font-semibold text-gray-800">
              <input type="checkbox" checked={!!done[l]} onChange={(e) => setDone({ ...done, [l]: e.target.checked })} className="h-4 w-4 accent-[color:var(--logo-pink-dark)]" />
              {l}
            </label>
          ))}
        </div>
      )}
      <Field label={condition === "DAMAGED" ? "Description des dégâts" : "Notes (facultatif)"} required={condition === "DAMAGED"} hint={condition === "DAMAGED" ? "Un incident est ouvert automatiquement." : undefined}>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${FIELD} resize-none`} />
      </Field>
    </PanelForm>
  );
};

/* ───────────── Série ───────────── */

const SeriesTab: React.FC<{ group: string; current: string; canUpdate: boolean; canCancel: boolean; onRefresh: () => void }> = ({ group, current, canUpdate, canCancel, onRefresh }) => {
  const qc = useQueryClient();
  const series = useQuery({ queryKey: ["booking-series", group], queryFn: () => bookingService.getSeries(group) });
  const [from, setFrom] = useState("");
  const [shift, setShift] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [panel, setPanel] = useState<null | "reschedule">(null);
  const [outcome, setOutcome] = useState<{ changed: number; skipped: number; refused?: Record<string, string> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const after = () => {
    qc.invalidateQueries({ queryKey: ["booking-series", group] });
    onRefresh();
  };

  const reschedule = useMutation({
    mutationFn: (accept: boolean) => {
      const t = (v: string) => ({ hour: Number(v.slice(0, 2)), minute: Number(v.slice(3, 5)) });
      return bookingService.rescheduleSeries(
        group,
        { shiftDays: shift ? Number(shift) : undefined, newStartTime: startTime ? t(startTime) : undefined, newEndTime: endTime ? t(endTime) : undefined, acceptPriceChange: accept || undefined },
        from || undefined,
      );
    },
    onSuccess: (o) => {
      setOutcome(o);
      setPanel(null);
      after();
    },
    onError: (e) => setError(apiMessage(e, "Modification impossible")),
  });

  const list = series.data ?? [];
  return (
    <div className="space-y-4">
      <Section title={`Série ${group}`} icon={Repeat} description="Les occurrences passées ou déjà modifiées sont laissées de côté.">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">À partir du (facultatif)</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD} />
          </div>
          {canUpdate && (
            <ActionButton variant="ghost" icon={CalendarClock} className="self-end" onClick={() => setPanel(panel ? null : "reschedule")}>Décaler</ActionButton>
          )}
          {canCancel && (
            <ActionButton
              variant="danger"
              icon={Trash2}
              className="self-end"
              onClick={() =>
                toast.confirm({
                  tone: "danger",
                  message: from ? `Annuler la série à partir du ${from} ?` : "Annuler toute la série ?",
                  confirmLabel: "Annuler la série",
                  successMessage: "Série annulée",
                  errorMessage: "Annulation impossible",
                  onConfirm: async () => {
                    const o = await bookingService.cancelSeries(group, from || undefined);
                    setOutcome(o);
                    after();
                  },
                })
              }
            >
              Annuler la série
            </ActionButton>
          )}
        </div>
      </Section>

      {panel === "reschedule" && (
        <PanelForm
          title="Décaler la série"
          pending={reschedule.isPending}
          submitLabel="Appliquer"
          submitDisabled={!shift && !startTime && !endTime}
          error={error}
          onCancel={() => setPanel(null)}
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            reschedule.mutate(false);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Décalage (jours)" hint="Négatif pour avancer.">
              <input type="number" value={shift} onChange={(e) => setShift(e.target.value)} className={FIELD} />
            </Field>
            <Field label="Nouvelle heure de début">
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={FIELD} />
            </Field>
            <Field label="Nouvelle heure de fin">
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={FIELD} />
            </Field>
          </div>
        </PanelForm>
      )}

      {outcome && (
        <div className="rounded-2xl bg-gray-50 p-4 text-sm">
          <p className="font-semibold text-gray-900">{outcome.changed} modifiée(s), {outcome.skipped} laissée(s) de côté</p>
          {outcome.refused && Object.keys(outcome.refused).length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-red-700">
              {Object.entries(outcome.refused).map(([k, v]) => (
                <li key={k}><span className="font-mono">{k}</span> : {v}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Section title="Occurrences">
        <div className="space-y-2">
          {list.map((o) => (
            <Link key={o.bookingNumber} to={`/bookings/${o.bookingNumber}`}>
              <ItemRow className={`mb-2 flex items-center justify-between gap-3 hover:bg-gray-50 ${o.bookingNumber === current ? "ring-2 ring-[color:var(--logo-pink)]" : ""}`}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{formatDateTime(o.startedAt)} → {String(o.endedAt).slice(11, 16)}</p>
                  <p className="font-mono text-xs text-gray-500">{o.bookingNumber}</p>
                </div>
                <BookingStatusChip status={o.status} />
              </ItemRow>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
};

/* ───────────── Historique ───────────── */

const HistoryTab: React.FC<{ n: string }> = ({ n }) => {
  const history = useQuery({ queryKey: ["booking-history", n], queryFn: () => bookingService.getBookingHistory(n) });
  const events = useQuery({ queryKey: ["booking-events", n], queryFn: () => bookingService.getBookingEvents(n) });
  const h = history.data ?? [];
  const ev = events.data ?? [];
  return (
    <div className="space-y-4">
      <Section title="Changements de statut" icon={History}>
        {h.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun changement.</p>
        ) : (
          <div className="space-y-2">
            {h.map((x, i) => (
              <ItemRow key={i}>
                <div className="flex flex-wrap items-center gap-2">
                  {x.fromStatus && <BookingStatusChip status={x.fromStatus} />}
                  <span className="text-gray-400">→</span>
                  <BookingStatusChip status={x.toStatus} />
                  <span className="ml-auto text-xs text-gray-500">{formatDateTime(x.changedAt)} · {x.changedBy}</span>
                </div>
                {x.reason && <p className="mt-2 text-sm text-gray-700">{x.reason}</p>}
              </ItemRow>
            ))}
          </div>
        )}
      </Section>
      <Section title="Événements" icon={Bell}>
        {ev.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun événement.</p>
        ) : (
          <div className="space-y-2">
            {ev.map((x) => (
              <ItemRow key={x.eventNumber}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">{x.title}</p>
                  <p className="shrink-0 text-xs text-gray-500">{formatDateTime(x.createdAt)}</p>
                </div>
                {x.description && <p className="mt-1 text-sm text-gray-600">{x.description}</p>}
              </ItemRow>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

export default BookingDetailPage;
