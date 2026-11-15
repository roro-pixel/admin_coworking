import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Calendar,
  CheckCircle,
  CreditCard,
  Eye,
  History,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  Phone,
  Play,
  RefreshCw,
  UserMinus,
  UserPlus,
  UserX,
  XCircle,
} from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type {
  BookingEvent,
  BookingHistory,
  BookingParticipantRole,
  BookingStatus,
} from "../../services/booking.service";
import { billingService } from "../../services/billing.service";
import { AdminLayout } from "../layout/AdminLayout";
import { brandVars } from "../layout/adminTheme";
import { MemberAutocomplete } from "../members/MemberAutocomplete";
import type { MemberSummaryResponse } from "../../services/member.service";
import { DetailsSkeleton, ListSkeleton } from "../ui/Skeleton";
import { Toaster } from "../ui/Toaster";
import { toast } from "../ui/toastStore";
import {
  ActionButton,
  CheckField,
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
} from "../subscription/kit";
import type { TabItem } from "../subscription/kit";
import {
  FIELD,
  FIELD_SOFT,
  apiMessage,
  formatDate,
  formatDateTime,
  formatMoney,
} from "../subscription/kitUtils";
import {
  BOOKING_STATUS,
  OWNER_TYPE_LABELS,
  PARTICIPANT_ROLE_LABELS,
  PARTICIPANT_STATUS_LABELS,
  PAYMENT_MODE_LABELS,
  extractAccessCode,
  getQrCodeUrl,
  statusOf,
} from "./bookingLabels";

type Tab = "info" | "participants" | "history" | "events";
type Panel = null | "code" | "invoice";

const ROLE_OPTIONS: BookingParticipantRole[] = ["HOST", "GUEST", "ORGANIZER"];

const EMPTY_PARTICIPANT = {
  memberCode: "",
  name: "",
  email: "",
  phone: "",
  role: "GUEST" as BookingParticipantRole,
};

const today = () => new Date().toISOString().split("T")[0];

export const BookingDetailPage: React.FC = () => {
  const { bookingNumber = "" } = useParams<{ bookingNumber: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [panel, setPanel] = useState<Panel>(null);
  const [newParticipant, setNewParticipant] = useState(EMPTY_PARTICIPANT);
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    documentType: "INVOICE" as "INVOICE" | "PROFORMA_INVOICE",
    issueDate: today(),
    dueDate: "",
    paymentInstructions: "",
    internalNotes: "",
  });
  const [accessCode, setAccessCode] = useState("");
  const [codeNote, setCodeNote] = useState("");
  const [codeSendEmail, setCodeSendEmail] = useState(false);

  const {
    data: booking,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["booking", bookingNumber],
    queryFn: () => bookingService.getBooking(bookingNumber),
    enabled: !!bookingNumber,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["booking-history", bookingNumber],
    queryFn: () => bookingService.getBookingHistory(bookingNumber),
    enabled: !!bookingNumber && activeTab === "history",
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["booking-events", bookingNumber],
    queryFn: () => bookingService.getBookingEvents(bookingNumber),
    enabled: !!bookingNumber && activeTab === "events",
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    queryClient.invalidateQueries({ queryKey: ["booking", bookingNumber] });
    queryClient.invalidateQueries({ queryKey: ["booking-history", bookingNumber] });
    queryClient.invalidateQueries({ queryKey: ["booking-events", bookingNumber] });
  };

  const fail = (fallback: string) => (e: unknown) => toast.error(apiMessage(e, fallback));

  // Actions directes : bouton en attente puis toast
  const confirmMutation = useMutation({
    mutationFn: () => bookingService.confirmBooking(bookingNumber),
    onSuccess: () => {
      refresh();
      toast.success("Réservation confirmée");
    },
    onError: fail("Erreur lors du changement de statut."),
  });
  const approveMutation = useMutation({
    mutationFn: () => bookingService.approveBooking(bookingNumber),
    onSuccess: () => {
      refresh();
      toast.success("Réservation approuvée");
    },
    onError: fail("Erreur lors du changement de statut."),
  });
  const startMutation = useMutation({
    mutationFn: () => bookingService.startBooking(bookingNumber),
    onSuccess: () => {
      refresh();
      toast.success("Réservation démarrée");
    },
    onError: fail("Erreur lors du changement de statut."),
  });
  const completeMutation = useMutation({
    mutationFn: () => bookingService.completeBooking(bookingNumber),
    onSuccess: () => {
      refresh();
      toast.success("Réservation terminée");
    },
    onError: fail("Erreur lors du changement de statut."),
  });
  const checkInMutation = useMutation({
    mutationFn: () => bookingService.checkIn(bookingNumber, { actor: "admin" }),
    onSuccess: () => {
      refresh();
      toast.success("Check-in effectué");
    },
    onError: fail("Erreur lors du check-in."),
  });
  const checkOutMutation = useMutation({
    mutationFn: () => bookingService.checkOut(bookingNumber, { actor: "admin" }),
    onSuccess: () => {
      refresh();
      toast.success("Check-out effectué");
    },
    onError: fail("Erreur lors du check-out."),
  });
  const checkInByCodeMutation = useMutation({
    mutationFn: () =>
      bookingService.checkInByQrToken(extractAccessCode(accessCode), {
        actor: "admin",
        note: codeNote || undefined,
        sendEmail: codeSendEmail,
      }),
    onSuccess: () => {
      setPanel(null);
      setAccessCode("");
      setCodeNote("");
      setCodeSendEmail(false);
      refresh();
      toast.success("Check-in effectué");
    },
    onError: fail("Code d'accès invalide ou check-in impossible."),
  });

  // Actions confirmées par toast : le toast affiche lui-même le résultat
  const rejectMutation = useMutation({
    mutationFn: () => bookingService.rejectBooking(bookingNumber, { reason: "Rejeté par admin" }),
    onSuccess: refresh,
  });
  const cancelMutation = useMutation({
    mutationFn: () => bookingService.cancelBooking(bookingNumber, { reason: "Annulé par admin" }),
    onSuccess: refresh,
  });
  const noShowMutation = useMutation({
    mutationFn: () => bookingService.noShowBooking(bookingNumber, { reason: "Non-présentation" }),
    onSuccess: refresh,
  });
  const earlyCheckInMutation = useMutation({
    mutationFn: () =>
      bookingService.earlyCheckIn(bookingNumber, {
        actor: "admin",
        note: "Check-in anticipé depuis l'administration",
        sendEmail: false,
      }),
    onSuccess: refresh,
  });
  const removeParticipantMutation = useMutation({
    mutationFn: (participantId: number) =>
      bookingService.removeParticipant(bookingNumber, participantId),
    onSuccess: refresh,
  });

  const addParticipantMutation = useMutation({
    mutationFn: () =>
      bookingService.addParticipant(bookingNumber, {
        memberCode: newParticipant.memberCode || undefined,
        name: newParticipant.name,
        email: newParticipant.email || undefined,
        phone: newParticipant.phone || undefined,
        role: newParticipant.role,
      }),
    onSuccess: () => {
      refresh();
      setNewParticipant(EMPTY_PARTICIPANT);
      setSelectedMember(null);
      toast.success("Participant ajouté");
    },
    onError: fail("Erreur lors de l'ajout du participant."),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: () =>
      billingService.createInvoiceFromReservation({
        mode: "BOOKING",
        bookingNumber,
        documentType: invoiceForm.documentType,
        issueDate: invoiceForm.issueDate,
        dueDate: invoiceForm.dueDate || undefined,
        paymentInstructions: invoiceForm.paymentInstructions || undefined,
        internalNotes: invoiceForm.internalNotes || undefined,
      }),
    onSuccess: (invoice) => {
      setPanel(null);
      queryClient.invalidateQueries({ queryKey: ["booking", bookingNumber] });
      navigate(`/billing/documents/${invoice.documentNumber}`);
    },
    onError: fail("Erreur lors de la facturation de la réservation."),
  });

  const ask = (
    message: string,
    confirmLabel: string,
    successMessage: string,
    run: () => Promise<unknown>,
    tone: "danger" | "primary" = "danger",
  ) =>
    toast.confirm({
      message,
      detail: bookingNumber,
      confirmLabel,
      pendingLabel: "Enregistrement en cours",
      successMessage,
      errorMessage: "L'action a échoué",
      tone,
      onConfirm: run,
    });

  if (isLoading) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <DetailsSkeleton />
        </div>
      </AdminLayout>
    );
  }

  if (error || !booking) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <PageHeader title="Réservation introuvable" onBack={() => navigate("/bookings")} backLabel="Réservations" />
          <ErrorBlock message="Cette réservation n'existe pas ou n'est plus accessible." onRetry={() => refetch()} />
        </div>
        <Toaster />
      </AdminLayout>
    );
  }

  const s = booking.status as BookingStatus;
  const st = statusOf(BOOKING_STATUS, s);
  const isAlreadyBilled = booking.lines?.some((line) => !!line.billableNumber);
  const canInvoice = ["COMPLETED", "CONFIRMED", "IN_PROGRESS"].includes(s) && !isAlreadyBilled;
  const canCancel = ["DRAFT", "PENDING_APPROVAL", "CONFIRMED", "IN_PROGRESS", "REJECTED"].includes(s);
  const participants = booking.participants ?? [];

  const busy =
    confirmMutation.isPending ||
    approveMutation.isPending ||
    startMutation.isPending ||
    completeMutation.isPending ||
    checkInMutation.isPending ||
    checkOutMutation.isPending ||
    checkInByCodeMutation.isPending ||
    createInvoiceMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    noShowMutation.isPending ||
    earlyCheckInMutation.isPending;

  const tabs: TabItem<Tab>[] = [
    { id: "info", label: "Informations", icon: Eye },
    { id: "participants", label: "Participants", icon: UserPlus, count: participants.length },
    { id: "history", label: "Historique", icon: History },
    { id: "events", label: "Événements", icon: Calendar },
  ];

  const detectedCode = extractAccessCode(accessCode);

  return (
    <AdminLayout>
      <div style={brandVars} className="mx-auto w-full max-w-4xl">
        <PageHeader
          title={booking.bookingNumber}
          subtitle={booking.resourceName}
          onBack={() => navigate("/bookings")}
          backLabel="Réservations"
          badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
          actions={
            <ActionButton variant="ghost" icon={RefreshCw} pending={isFetching} onClick={() => refetch()}>
              Actualiser
            </ActionButton>
          }
        />

        {/* Actions selon le statut */}
        <div className="mb-4 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold text-gray-400">
            Créée le {formatDateTime(booking.createdAt)}
            {isAlreadyBilled && " · Déjà facturée"}
          </p>
          <div className="flex flex-wrap gap-2">
            {s === "DRAFT" && (
              <ActionButton
                icon={CheckCircle}
                disabled={busy}
                pending={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
              >
                Confirmer
              </ActionButton>
            )}
            {s === "PENDING_APPROVAL" && (
              <>
                <ActionButton
                  icon={CheckCircle}
                  disabled={busy}
                  pending={approveMutation.isPending}
                  onClick={() => approveMutation.mutate()}
                >
                  Approuver
                </ActionButton>
                <ActionButton
                  variant="danger"
                  icon={XCircle}
                  disabled={busy}
                  onClick={() =>
                    ask("Rejeter cette réservation ?", "Rejeter", "Réservation rejetée", () =>
                      rejectMutation.mutateAsync(),
                    )
                  }
                >
                  Rejeter
                </ActionButton>
              </>
            )}
            {s === "CONFIRMED" && (
              <>
                <ActionButton
                  icon={Play}
                  disabled={busy}
                  pending={startMutation.isPending}
                  onClick={() => startMutation.mutate()}
                >
                  Démarrer
                </ActionButton>
                <ActionButton
                  variant="ghost"
                  icon={LogIn}
                  disabled={busy}
                  pending={checkInMutation.isPending}
                  onClick={() => checkInMutation.mutate()}
                >
                  Check-in
                </ActionButton>
                <ActionButton
                  variant="ghost"
                  icon={KeyRound}
                  disabled={busy}
                  onClick={() => {
                    setAccessCode(booking.checkInToken || "");
                    setPanel(panel === "code" ? null : "code");
                  }}
                >
                  Code d'accès
                </ActionButton>
                <ActionButton
                  variant="ghost"
                  icon={LogIn}
                  disabled={busy}
                  onClick={() =>
                    ask(
                      "Forcer le check-in anticipé ?",
                      "Forcer le check-in",
                      "Check-in anticipé effectué",
                      () => earlyCheckInMutation.mutateAsync(),
                      "primary",
                    )
                  }
                >
                  Check-in anticipé
                </ActionButton>
              </>
            )}
            {s === "IN_PROGRESS" && (
              <>
                <ActionButton
                  variant="ghost"
                  icon={LogOut}
                  disabled={busy}
                  pending={checkOutMutation.isPending}
                  onClick={() => checkOutMutation.mutate()}
                >
                  Check-out
                </ActionButton>
                <ActionButton
                  icon={CheckCircle}
                  disabled={busy}
                  pending={completeMutation.isPending}
                  onClick={() => completeMutation.mutate()}
                >
                  Terminer
                </ActionButton>
              </>
            )}
            {(s === "CONFIRMED" || s === "IN_PROGRESS") && (
              <ActionButton
                variant="ghost"
                icon={UserX}
                disabled={busy}
                onClick={() =>
                  ask(
                    "Marquer comme non-présentation ?",
                    "Marquer no-show",
                    "Non-présentation enregistrée",
                    () => noShowMutation.mutateAsync(),
                  )
                }
              >
                No-show
              </ActionButton>
            )}
            {canInvoice && (
              <ActionButton
                variant="ghost"
                icon={CreditCard}
                disabled={busy}
                onClick={() => {
                  setInvoiceForm((f) => ({ ...f, issueDate: today() }));
                  setPanel(panel === "invoice" ? null : "invoice");
                }}
              >
                Facturer
              </ActionButton>
            )}
            {canCancel && (
              <ActionButton
                variant="danger"
                icon={Ban}
                disabled={busy}
                onClick={() =>
                  ask("Annuler cette réservation ?", "Annuler la réservation", "Réservation annulée", () =>
                    cancelMutation.mutateAsync(),
                  )
                }
              >
                Annuler
              </ActionButton>
            )}
          </div>
        </div>

        {panel === "code" && (
          <PanelForm
            title="Check-in par code d'accès"
            pending={checkInByCodeMutation.isPending}
            submitLabel="Valider le check-in"
            submitDisabled={!detectedCode}
            onCancel={() => setPanel(null)}
            onSubmit={(e) => {
              e.preventDefault();
              if (detectedCode) checkInByCodeMutation.mutate();
            }}
          >
            <p className="-mt-2 text-sm text-gray-500">
              Scannez le QR code du membre ou saisissez le code affiché dans son portail.
            </p>
            <Field
              label="Code d'accès ou URL QR"
              required
              hint={
                detectedCode && detectedCode !== accessCode.trim()
                  ? `Code détecté : ${detectedCode}`
                  : undefined
              }
            >
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className={FIELD_SOFT}
                placeholder="Ex : CHK-... ou https://.../scan/CHK-..."
                autoFocus
              />
            </Field>
            <Field label="Note">
              <textarea
                value={codeNote}
                onChange={(e) => setCodeNote(e.target.value)}
                rows={2}
                className={`${FIELD_SOFT} resize-none`}
                placeholder="Ex : arrivé à l'accueil"
              />
            </Field>
            <CheckField
              checked={codeSendEmail}
              onChange={setCodeSendEmail}
              label="Envoyer une notification email"
            />
          </PanelForm>
        )}

        {panel === "invoice" && (
          <PanelForm
            title="Facturer la réservation"
            pending={createInvoiceMutation.isPending}
            submitLabel="Générer la facture"
            submitDisabled={!invoiceForm.issueDate}
            onCancel={() => setPanel(null)}
            onSubmit={(e) => {
              e.preventDefault();
              createInvoiceMutation.mutate();
            }}
          >
            <p className="-mt-2 text-sm text-gray-500">
              {formatMoney(booking.totalAmount, booking.currency)} · {booking.resourceName}
            </p>
            <Field label="Type de document">
              <select
                value={invoiceForm.documentType}
                onChange={(e) =>
                  setInvoiceForm((f) => ({
                    ...f,
                    documentType: e.target.value as "INVOICE" | "PROFORMA_INVOICE",
                  }))
                }
                className={FIELD_SOFT}
              >
                <option value="INVOICE">Facture</option>
                <option value="PROFORMA_INVOICE">Proforma</option>
              </select>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date d'émission" required>
                <input
                  type="date"
                  value={invoiceForm.issueDate}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, issueDate: e.target.value }))}
                  className={FIELD_SOFT}
                />
              </Field>
              <Field label="Date d'échéance">
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  min={invoiceForm.issueDate}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className={FIELD_SOFT}
                />
              </Field>
            </div>
            <Field label="Instructions de paiement">
              <textarea
                value={invoiceForm.paymentInstructions}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, paymentInstructions: e.target.value }))}
                rows={2}
                className={`${FIELD_SOFT} resize-none`}
              />
            </Field>
            <Field label="Notes internes">
              <textarea
                value={invoiceForm.internalNotes}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, internalNotes: e.target.value }))}
                rows={2}
                className={`${FIELD_SOFT} resize-none`}
              />
            </Field>
          </PanelForm>
        )}

        <div className="mb-4">
          <Tabs items={tabs} active={activeTab} onChange={setActiveTab} variant="soft" />
        </div>

        {activeTab === "info" && (
          <div className="space-y-4">
            <Section title="Réservation">
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Detail label="Client">{booking.ownerName || booking.ownerCode}</Detail>
                <Detail label="Type de client">{OWNER_TYPE_LABELS[booking.ownerType] ?? booking.ownerType}</Detail>
                <Detail label="Contact">{booking.contactName}</Detail>
                <Detail label="Email">
                  {booking.contactEmail && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail size={13} className="text-gray-400" />
                      {booking.contactEmail}
                    </span>
                  )}
                </Detail>
                <Detail label="Téléphone">
                  {booking.contactPhone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone size={13} className="text-gray-400" />
                      {booking.contactPhone}
                    </span>
                  )}
                </Detail>
                <Detail label="Ressource">{booking.resourceName}</Detail>
                <Detail label="Code ressource" mono>
                  {booking.resourceCode}
                </Detail>
                <Detail label="Type de ressource">{booking.resourceTypeCode}</Detail>
                <Detail label="Groupe">{booking.resourceGroupCode}</Detail>
                <Detail label="Début">{formatDateTime(booking.startedAt)}</Detail>
                <Detail label="Fin">{formatDateTime(booking.endedAt)}</Detail>
                <Detail label="Durée">{booking.durationMinutes ? `${booking.durationMinutes} minutes` : ""}</Detail>
                <Detail label="Mode de paiement">
                  {PAYMENT_MODE_LABELS[booking.paymentMode] ?? booking.paymentMode}
                </Detail>
                <Detail label="Abonnement" mono>
                  {booking.subscriptionNumber}
                </Detail>
                <Detail label="Pass" mono>
                  {booking.passNumber}
                </Detail>
                <Detail label="Droit" mono>
                  {booking.entitlementCode}
                </Detail>
                <Detail label="Montant total">
                  <span className="text-lg font-bold">{formatMoney(booking.totalAmount, booking.currency)}</span>
                </Detail>
                <Detail label="Enregistrement" >{formatDateTime(booking.checkedInAt)}</Detail>
                <Detail label="Sortie">{formatDateTime(booking.checkedOutAt)}</Detail>
                <Detail label="Notes" wide>
                  {booking.notes}
                </Detail>
                <Detail label="Lien de réunion virtuelle" wide>
                  {booking.virtualMeetingUrl && (
                    <a
                      href={booking.virtualMeetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-[color:var(--logo-pink-dark)] hover:underline"
                    >
                      {booking.virtualMeetingUrl}
                    </a>
                  )}
                </Detail>
                <Detail label="Réservation récurrente" wide>
                  {booking.recurrenceGroupNumber &&
                    `Groupe ${booking.recurrenceGroupNumber}${
                      booking.recurrence
                        ? ` · tous les ${booking.recurrence.intervalValue} jour(s) jusqu'au ${formatDate(booking.recurrence.endDate)}`
                        : ""
                    }`}
                </Detail>
              </div>
            </Section>

            {booking.lines && booking.lines.length > 0 && (
              <Section title="Détail des lignes">
                <div className="space-y-2">
                  {booking.lines.map((line) => (
                    <ItemRow key={line.id} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 text-sm text-gray-700">
                        {line.description} × {line.quantity}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-gray-900">
                        {formatMoney(line.amount, line.currency)}
                      </span>
                    </ItemRow>
                  ))}
                </div>
              </Section>
            )}

            {booking.checkInQrValue && s === "CONFIRMED" && (
              <Section title="QR code de check-in" description="À présenter à l'accueil">
                <img
                  src={getQrCodeUrl(booking.checkInQrValue)}
                  alt="QR code de check-in"
                  className="mx-auto h-40 w-40 rounded-2xl bg-white p-2 shadow-sm"
                />
              </Section>
            )}
          </div>
        )}

        {activeTab === "participants" && (
          <div className="space-y-4">
            <Section title="Participants">
              {participants.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">Aucun participant</p>
              ) : (
                <div className="space-y-2">
                  {participants.map((p) => (
                    <ItemRow key={p.id ?? p.name} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{p.name}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {PARTICIPANT_ROLE_LABELS[p.role] ?? p.role}
                          {p.status && ` · ${PARTICIPANT_STATUS_LABELS[p.status] ?? p.status}`}
                        </p>
                        {(p.email || p.phone) && (
                          <p className="mt-0.5 break-all text-xs text-gray-400">
                            {[p.email, p.phone].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <IconButton
                        icon={UserMinus}
                        label="Retirer"
                        tone="danger"
                        disabled={removeParticipantMutation.isPending}
                        onClick={() =>
                          toast.confirm({
                            message: `Retirer "${p.name}" de la réservation ?`,
                            detail: bookingNumber,
                            confirmLabel: "Retirer",
                            pendingLabel: "Retrait en cours",
                            successMessage: "Participant retiré",
                            errorMessage: "Le retrait a échoué",
                            onConfirm: () => removeParticipantMutation.mutateAsync(p.id!),
                          })
                        }
                      />
                    </ItemRow>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Ajouter un participant" icon={UserPlus}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newParticipant.name) addParticipantMutation.mutate();
                }}
                className="space-y-4"
              >
                <Field label="Membre existant" hint="Facultatif, pré-remplit les champs">
                  <MemberAutocomplete
                    onSelect={(member) => {
                      setSelectedMember(member);
                      if (member) {
                        setNewParticipant((prev) => ({
                          ...prev,
                          memberCode: member.memberId,
                          name: member.fullName || prev.name,
                          email: member.email || prev.email,
                          phone: member.phone || prev.phone,
                        }));
                      } else {
                        setNewParticipant((prev) => ({ ...prev, memberCode: "" }));
                      }
                    }}
                    selectedMember={selectedMember}
                    placeholder="Lier à un membre (optionnel)..."
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Nom" required>
                    <input
                      value={newParticipant.name}
                      onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                      className={FIELD}
                    />
                  </Field>
                  <Field label="Rôle">
                    <select
                      value={newParticipant.role}
                      onChange={(e) =>
                        setNewParticipant({
                          ...newParticipant,
                          role: e.target.value as BookingParticipantRole,
                        })
                      }
                      className={FIELD}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {PARTICIPANT_ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={newParticipant.email}
                      onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                      className={FIELD}
                    />
                  </Field>
                  <Field label="Téléphone">
                    <input
                      type="tel"
                      value={newParticipant.phone}
                      onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
                      className={FIELD}
                    />
                  </Field>
                </div>
                {newParticipant.memberCode && (
                  <p className="font-mono text-xs text-[color:var(--logo-pink-dark)]">
                    Lié au membre : {newParticipant.memberCode}
                  </p>
                )}
                <div className="flex justify-end">
                  <ActionButton
                    type="submit"
                    icon={UserPlus}
                    className="w-full sm:w-auto"
                    disabled={!newParticipant.name}
                    pending={addParticipantMutation.isPending}
                  >
                    Ajouter le participant
                  </ActionButton>
                </div>
              </form>
            </Section>
          </div>
        )}

        {activeTab === "history" && (
          <Section title="Historique des statuts">
            {historyLoading ? (
              <ListSkeleton rows={3} />
            ) : !history || history.length === 0 ? (
              <EmptyState icon={History} title="Aucun historique" />
            ) : (
              <div className="space-y-2">
                {history.map((item: BookingHistory, idx: number) => {
                  const from = statusOf(BOOKING_STATUS, item.fromStatus);
                  const to = statusOf(BOOKING_STATUS, item.toStatus);
                  return (
                    <ItemRow key={idx}>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusChip tone={from.tone}>{from.label}</StatusChip>
                        <span className="text-gray-400">→</span>
                        <StatusChip tone={to.tone}>{to.label}</StatusChip>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Par {item.changedBy} · {formatDateTime(item.changedAt)}
                      </p>
                      {item.reason && <p className="mt-0.5 text-xs text-gray-400">Motif : {item.reason}</p>}
                    </ItemRow>
                  );
                })}
              </div>
            )}
          </Section>
        )}

        {activeTab === "events" && (
          <Section title="Événements">
            {eventsLoading ? (
              <ListSkeleton rows={3} />
            ) : !events || events.length === 0 ? (
              <EmptyState icon={Calendar} title="Aucun événement" />
            ) : (
              <div className="space-y-2">
                {events.map((event: BookingEvent) => (
                  <ItemRow key={event.eventNumber}>
                    <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(event.createdAt)}</p>
                    <p className="mt-0.5 font-mono text-xs text-gray-400">{event.eventType}</p>
                    {event.description && <p className="mt-1 text-xs text-gray-500">{event.description}</p>}
                  </ItemRow>
                ))}
              </div>
            )}
          </Section>
        )}
      </div>
      <Toaster />
    </AdminLayout>
  );
};
