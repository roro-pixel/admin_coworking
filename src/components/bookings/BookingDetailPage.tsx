import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  History,
  Calendar,
  Mail,
  Phone,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  LogIn,
  LogOut,
  Loader2,
  Clock,
  CreditCard,
  Building2,
  FileText,
  RefreshCw,
  Eye,
} from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type {
  BookingResponse,
  BookingHistory,
  BookingEvent,
  BookingParticipantRole,
  BookingStatus,
} from "../../services/booking.service";
import { billingService } from "../../services/billing.service";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { MemberAutocomplete } from "../../components/members/MemberAutocomplete";
import { ModalPortal } from "../../components/ui/ModalPortal";
import type { MemberSummaryResponse } from "../../services/member.service";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  DRAFT: {
    label: "Brouillon",
    color: "bg-gray-100 text-gray-700",
    icon: Clock,
  },
  PENDING_APPROVAL: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  REJECTED: {
    label: "Rejetée",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  CONFIRMED: {
    label: "Confirmée",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  IN_PROGRESS: {
    label: "En cours",
    color: "bg-blue-100 text-blue-700",
    icon: Play,
  },
  COMPLETED: {
    label: "Terminée",
    color: "bg-gray-100 text-gray-700",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Annulée",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  NO_SHOW: {
    label: "Non présent",
    color: "bg-orange-100 text-orange-700",
    icon: AlertTriangle,
  },
  EXPIRED: {
    label: "Expirée",
    color: "bg-gray-100 text-gray-500",
    icon: Clock,
  },
};

const paymentModeLabels: Record<
  string,
  { label: string; icon: React.ElementType }
> = {
  DIRECT: { label: "Paiement direct", icon: CreditCard },
  SUBSCRIPTION: { label: "Abonnement", icon: Building2 },
  PASS: { label: "Pass", icon: FileText },
};

const roleLabels: Record<string, string> = {
  HOST: "Organisateur",
  GUEST: "Invité",
  ORGANIZER: "Responsable",
};

const roleOptions: { value: BookingParticipantRole; label: string }[] = [
  { value: "HOST", label: "Organisateur" },
  { value: "GUEST", label: "Invité" },
  { value: "ORGANIZER", label: "Responsable" },
];

const getQrCodeUrl = (value: string): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(value)}`;
};

export const BookingDetailPage: React.FC = () => {
  const { bookingNumber } = useParams<{ bookingNumber: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "info" | "participants" | "history" | "events"
  >("info");
  const [newParticipant, setNewParticipant] = useState({
    memberCode: "",
    name: "",
    email: "",
    phone: "",
    role: "GUEST" as BookingParticipantRole,
  });
  const [selectedParticipantMember, setSelectedParticipantMember] =
    useState<MemberSummaryResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    documentType: "INVOICE" as "INVOICE" | "PROFORMA_INVOICE",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    paymentInstructions: "",
    internalNotes: "",
  });

  const {
    data: booking,
    isLoading,
    refetch: refetchBooking,
  } = useQuery({
    queryKey: ["booking", bookingNumber],
    queryFn: () => bookingService.getBooking(bookingNumber!),
    enabled: !!bookingNumber,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["booking-history", bookingNumber],
    queryFn: () => bookingService.getBookingHistory(bookingNumber!),
    enabled: !!bookingNumber && activeTab === "history",
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["booking-events", bookingNumber],
    queryFn: () => bookingService.getBookingEvents(bookingNumber!),
    enabled: !!bookingNumber && activeTab === "events",
  });

  const invalidateAndRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    queryClient.invalidateQueries({ queryKey: ["booking", bookingNumber] });
    refetchBooking();
  };

  const makeStatusMutation = (
    fn: (bookingNumber: string, data?: any) => Promise<BookingResponse>,
  ) =>
    useMutation({
      mutationFn: () => fn(booking!.bookingNumber),
      onSuccess: invalidateAndRefresh,
      onError: (error: any) => {
        setActionError(
          error?.response?.data?.message ||
            "Erreur lors du changement de statut.",
        );
      },
    });

  const confirmMutation = makeStatusMutation(
    bookingService.confirmBooking.bind(bookingService),
  );
  const approveMutation = makeStatusMutation(
    bookingService.approveBooking.bind(bookingService),
  );
  const rejectMutation = useMutation({
    mutationFn: () =>
      bookingService.rejectBooking(booking!.bookingNumber, {
        reason: "Rejeté par admin",
      }),
    onSuccess: invalidateAndRefresh,
    onError: (error: any) =>
      setActionError(error?.response?.data?.message || "Erreur lors du rejet."),
  });
  const startMutation = makeStatusMutation(
    bookingService.startBooking.bind(bookingService),
  );
  const checkInMutation = useMutation({
    mutationFn: () =>
      bookingService.checkIn(booking!.bookingNumber, { actor: "admin" }),
    onSuccess: invalidateAndRefresh,
    onError: (error: any) =>
      setActionError(
        error?.response?.data?.message || "Erreur lors du check-in.",
      ),
  });
  const checkOutMutation = useMutation({
    mutationFn: () =>
      bookingService.checkOut(booking!.bookingNumber, { actor: "admin" }),
    onSuccess: invalidateAndRefresh,
    onError: (error: any) =>
      setActionError(
        error?.response?.data?.message || "Erreur lors du check-out.",
      ),
  });
  const completeMutation = makeStatusMutation(
    bookingService.completeBooking.bind(bookingService),
  );
  const cancelMutation = useMutation({
    mutationFn: () =>
      bookingService.cancelBooking(booking!.bookingNumber, {
        reason: "Annulé par admin",
      }),
    onSuccess: invalidateAndRefresh,
    onError: (error: any) =>
      setActionError(
        error?.response?.data?.message || "Erreur lors de l'annulation.",
      ),
  });
  const noShowMutation = useMutation({
    mutationFn: () =>
      bookingService.noShowBooking(booking!.bookingNumber, {
        reason: "Non-présentation",
      }),
    onSuccess: invalidateAndRefresh,
    onError: (error: any) =>
      setActionError(error?.response?.data?.message || "Erreur."),
  });

  const anyStatusPending =
    confirmMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    startMutation.isPending ||
    checkInMutation.isPending ||
    checkOutMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending ||
    noShowMutation.isPending;

  const addParticipantMutation = useMutation({
    mutationFn: () =>
      bookingService.addParticipant(booking!.bookingNumber, {
        memberCode: newParticipant.memberCode || undefined,
        name: newParticipant.name,
        email: newParticipant.email || undefined,
        phone: newParticipant.phone || undefined,
        role: newParticipant.role,
      }),
    onSuccess: () => {
      invalidateAndRefresh();
      setNewParticipant({
        memberCode: "",
        name: "",
        email: "",
        phone: "",
        role: "GUEST",
      });
      setSelectedParticipantMember(null);
    },
    onError: (error: any) => {
      setActionError(
        error?.response?.data?.message ||
          "Erreur lors de l'ajout du participant.",
      );
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: (participantId: number) =>
      bookingService.removeParticipant(booking!.bookingNumber, participantId),
    onSuccess: invalidateAndRefresh,
    onError: (error: any) => {
      setActionError(
        error?.response?.data?.message ||
          "Erreur lors du retrait du participant.",
      );
    },
  });

  const handleRemoveParticipant = (id: number, name: string) => {
    if (confirm(`Retirer "${name}" de la réservation ?`)) {
      removeParticipantMutation.mutate(id);
    }
  };

  const createInvoiceMutation = useMutation({
    mutationFn: () =>
      billingService.createInvoiceFromReservation({
        mode: "BOOKING",
        bookingNumber: booking!.bookingNumber,
        documentType: invoiceForm.documentType,
        issueDate: invoiceForm.issueDate,
        dueDate: invoiceForm.dueDate || undefined,
        paymentInstructions: invoiceForm.paymentInstructions || undefined,
        internalNotes: invoiceForm.internalNotes || undefined,
      }),
    onSuccess: (invoice) => {
      setIsInvoiceModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["booking", bookingNumber] });
      navigate(`/billing/documents/${invoice.documentNumber}`);
    },
    onError: (error: any) => {
      setActionError(
        error?.response?.data?.message ||
          "Erreur lors de la facturation de la réservation.",
      );
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  if (!booking) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <XCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Réservation non trouvée</p>
          <button
            onClick={() => navigate("/admin/bookings")}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retour à la liste
          </button>
        </div>
      </AdminLayout>
    );
  }

  const status = statusConfig[booking.status];
  const StatusIcon = status?.icon;
  const s = booking.status as BookingStatus;
  const paymentMode = paymentModeLabels[booking.paymentMode];
  const PaymentIcon = paymentMode?.icon || CreditCard;
  const isAlreadyBilled = booking.lines?.some((line) => !!line.billableNumber);
  const canInvoice =
    ["COMPLETED", "CONFIRMED", "IN_PROGRESS"].includes(s) && !isAlreadyBilled;

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/bookings")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {booking.bookingNumber}
            </h1>
            <p className="text-gray-600 mt-1">{booking.resourceName}</p>
          </div>
        </div>
        <button
          onClick={() => refetchBooking()}
          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          title="Actualiser"
        >
          <RefreshCw size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Statut et actions */}
      <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {status && (
              <span
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}
              >
                {StatusIcon && <StatusIcon size={16} />}
                {status.label}
              </span>
            )}
            <span className="text-xs text-gray-500">
              Créée le {new Date(booking.createdAt).toLocaleString("fr-FR")}
            </span>
          </div>

          {actionError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <AlertTriangle size={14} />
              {actionError}
              <button
                onClick={() => setActionError(null)}
                className="underline"
              >
                Fermer
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-b flex flex-wrap gap-2">
          {s === "DRAFT" && (
            <button
              onClick={() => confirmMutation.mutate()}
              disabled={anyStatusPending}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-green-700 transition-colors"
            >
              {confirmMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle size={14} />
              )}
              Confirmer
            </button>
          )}

          {s === "PENDING_APPROVAL" && (
            <>
              <button
                onClick={() => approveMutation.mutate()}
                disabled={anyStatusPending}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-green-700 transition-colors"
              >
                {approveMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                Approuver
              </button>
              <button
                onClick={() => {
                  if (confirm("Rejeter cette réservation ?"))
                    rejectMutation.mutate();
                }}
                disabled={anyStatusPending}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-red-700 transition-colors"
              >
                {rejectMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <XCircle size={14} />
                )}
                Rejeter
              </button>
            </>
          )}

          {s === "CONFIRMED" && (
            <>
              <button
                onClick={() => startMutation.mutate()}
                disabled={anyStatusPending}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {startMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                Démarrer
              </button>
              <button
                onClick={() => checkInMutation.mutate()}
                disabled={anyStatusPending}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-indigo-700 transition-colors"
              >
                {checkInMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <LogIn size={14} />
                )}
                Check-in
              </button>
              <button
                onClick={() => {
                  if (confirm("Marquer comme non-présentation ?"))
                    noShowMutation.mutate();
                }}
                disabled={anyStatusPending}
                className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-orange-700 transition-colors"
              >
                {noShowMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <AlertTriangle size={14} />
                )}
                No-show
              </button>
            </>
          )}

          {s === "IN_PROGRESS" && (
            <>
              <button
                onClick={() => checkOutMutation.mutate()}
                disabled={anyStatusPending}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-indigo-700 transition-colors"
              >
                {checkOutMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <LogOut size={14} />
                )}
                Check-out
              </button>
              <button
                onClick={() => completeMutation.mutate()}
                disabled={anyStatusPending}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-green-700 transition-colors"
              >
                {completeMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                Terminer
              </button>
              <button
                onClick={() => {
                  if (confirm("Marquer comme non-présentation ?"))
                    noShowMutation.mutate();
                }}
                disabled={anyStatusPending}
                className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-orange-700 transition-colors"
              >
                {noShowMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <AlertTriangle size={14} />
                )}
                No-show
              </button>
            </>
          )}

          {[
            "DRAFT",
            "PENDING_APPROVAL",
            "CONFIRMED",
            "IN_PROGRESS",
            "REJECTED",
          ].includes(s) && (
            <button
              onClick={() => {
                if (confirm("Annuler cette réservation ?"))
                  cancelMutation.mutate();
              }}
              disabled={anyStatusPending}
              className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {cancelMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <XCircle size={14} />
              )}
              Annuler
            </button>
          )}

          {canInvoice && (
            <button
              onClick={() => {
                setActionError(null);
                setInvoiceForm((f) => ({
                  ...f,
                  issueDate: new Date().toISOString().split("T")[0],
                }));
                setIsInvoiceModalOpen(true);
              }}
              disabled={createInvoiceMutation.isPending}
              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-primary-700 transition-colors"
            >
              {createInvoiceMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CreditCard size={14} />
              )}
              Facturer
            </button>
          )}

          {isAlreadyBilled && (
            <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle size={14} />
              Déjà facturée
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex space-x-6">
            {(["info", "participants", "history", "events"] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === tab
                      ? "border-primary-600 text-primary-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "info" && <Eye size={14} />}
                  {tab === "participants" && <UserPlus size={14} />}
                  {tab === "history" && <History size={14} />}
                  {tab === "events" && <Calendar size={14} />}
                  {tab === "info"
                    ? "Informations"
                    : tab === "participants"
                      ? `Participants (${booking.participants?.length || 0})`
                      : tab === "history"
                        ? "Historique"
                        : "Événements"}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Contenu des tabs */}
        <div className="p-6">
          {activeTab === "info" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Client
                  </p>
                  <p className="font-medium text-gray-900 mt-1">
                    {booking.ownerName || booking.ownerCode}
                  </p>
                  <p className="text-xs text-gray-400">{booking.ownerType}</p>
                  {booking.subscriptionNumber && (
                    <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                      <Building2 size={12} />
                      Abonnement: {booking.subscriptionNumber}
                    </p>
                  )}
                  {booking.passNumber && (
                    <p className="text-xs text-purple-600 flex items-center gap-1">
                      <FileText size={12} />
                      Pass: {booking.passNumber}
                    </p>
                  )}
                  {booking.entitlementCode && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Droit: {booking.entitlementCode}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Contact
                  </p>
                  <p className="font-medium text-gray-900 mt-1">
                    {booking.contactName || "—"}
                  </p>
                  {booking.contactEmail && (
                    <p className="text-xs flex items-center gap-1 text-gray-500 mt-1">
                      <Mail size={12} />
                      {booking.contactEmail}
                    </p>
                  )}
                  {booking.contactPhone && (
                    <p className="text-xs flex items-center gap-1 text-gray-500">
                      <Phone size={12} />
                      {booking.contactPhone}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Ressource
                  </p>
                  <p className="font-medium text-gray-900 mt-1">
                    {booking.resourceName}
                  </p>
                  <p className="text-xs font-mono text-gray-400">
                    {booking.resourceCode}
                  </p>
                  {booking.resourceTypeCode && (
                    <p className="text-xs text-gray-500 mt-1">
                      Type: {booking.resourceTypeCode}
                    </p>
                  )}
                  {booking.resourceGroupCode && (
                    <p className="text-xs text-gray-500">
                      Groupe: {booking.resourceGroupCode}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Période
                  </p>
                  <p className="font-medium text-gray-900 mt-1">
                    {new Date(booking.startedAt).toLocaleString("fr-FR")}
                  </p>
                  <p className="text-xs text-gray-500">
                    → {new Date(booking.endedAt).toLocaleString("fr-FR")}
                  </p>
                  <p className="text-xs text-gray-400">
                    {booking.durationMinutes} minutes
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Montant
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {booking.totalAmount.toLocaleString("fr-FR")}{" "}
                    {booking.currency}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <PaymentIcon size={12} />
                    {paymentMode?.label || booking.paymentMode}
                  </p>
                </div>

                {booking.checkInQrValue && booking.status === "CONFIRMED" && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                      QR Code Check-in
                    </p>
                    <img
                      src={getQrCodeUrl(booking.checkInQrValue)}
                      alt="QR Code check-in"
                      className="mx-auto w-28 h-28 rounded-lg"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      À présenter à l'accueil
                    </p>
                  </div>
                )}

                {booking.virtualMeetingUrl && (
                  <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Lien de réunion virtuelle
                    </p>
                    <a
                      href={booking.virtualMeetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:underline break-all"
                    >
                      {booking.virtualMeetingUrl}
                    </a>
                  </div>
                )}
              </div>

              {booking.lines && booking.lines.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Détail des lignes
                  </p>
                  <div className="space-y-2">
                    {booking.lines.map((line) => (
                      <div
                        key={line.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm text-gray-700">
                          {line.description} × {line.quantity}
                        </span>
                        <span className="font-medium text-gray-900">
                          {line.amount.toLocaleString("fr-FR")} {line.currency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {booking.recurrenceGroupNumber && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Réservation récurrente
                  </p>
                  <p className="text-sm text-blue-700 font-medium mt-1">
                    Groupe: {booking.recurrenceGroupNumber}
                  </p>
                  {booking.recurrence && (
                    <p className="text-xs text-blue-600 mt-1">
                      Répète tous les {booking.recurrence.intervalValue} jour(s)
                      jusqu'au{" "}
                      {new Date(booking.recurrence.endDate).toLocaleDateString(
                        "fr-FR",
                      )}
                    </p>
                  )}
                </div>
              )}

              {booking.notes && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Notes
                  </p>
                  <p className="text-sm text-gray-700 mt-1">{booking.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "participants" && (
            <div className="space-y-6">
              <div className="space-y-3">
                {booking.participants?.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {participant.name}
                      </p>
                      <div className="flex gap-3 text-xs text-gray-500 mt-1">
                        {participant.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} />
                            {participant.email}
                          </span>
                        )}
                        {participant.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} />
                            {participant.phone}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {roleLabels[participant.role] || participant.role}
                        {participant.status && ` · ${participant.status}`}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleRemoveParticipant(
                          participant.id!,
                          participant.name,
                        )
                      }
                      disabled={removeParticipantMutation.isPending}
                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg disabled:opacity-40 transition-colors"
                      title="Retirer"
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                ))}
                {(!booking.participants ||
                  booking.participants.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun participant
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <p className="text-sm font-medium text-gray-700 mb-4">
                  Ajouter un participant
                </p>

                <div className="mb-4">
                  <label className="block text-xs text-gray-500 mb-1">
                    Membre existant (optionnel — pré-remplit les champs)
                  </label>
                  <MemberAutocomplete
                    onSelect={(member) => {
                      setSelectedParticipantMember(member);
                      if (member) {
                        setNewParticipant((prev) => ({
                          ...prev,
                          memberCode: member.memberId,
                          name: member.fullName || prev.name,
                          email: member.email || prev.email,
                          phone: member.phone || prev.phone,
                        }));
                      } else {
                        setNewParticipant((prev) => ({
                          ...prev,
                          memberCode: "",
                        }));
                      }
                    }}
                    selectedMember={selectedParticipantMember}
                    placeholder="Lier à un membre (optionnel)..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Nom *"
                    value={newParticipant.name}
                    onChange={(e) =>
                      setNewParticipant({
                        ...newParticipant,
                        name: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <select
                    value={newParticipant.role}
                    onChange={(e) =>
                      setNewParticipant({
                        ...newParticipant,
                        role: e.target.value as BookingParticipantRole,
                      })
                    }
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {roleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="email"
                    placeholder="Email"
                    value={newParticipant.email}
                    onChange={(e) =>
                      setNewParticipant({
                        ...newParticipant,
                        email: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="tel"
                    placeholder="Téléphone"
                    value={newParticipant.phone}
                    onChange={(e) =>
                      setNewParticipant({
                        ...newParticipant,
                        phone: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {newParticipant.memberCode && (
                  <p className="text-xs text-blue-500 mt-2 font-mono flex items-center gap-1">
                    <CheckCircle size={12} />
                    Lié au membre : {newParticipant.memberCode}
                  </p>
                )}

                <button
                  onClick={() => addParticipantMutation.mutate()}
                  disabled={
                    !newParticipant.name || addParticipantMutation.isPending
                  }
                  className="mt-4 w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {addParticipantMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  Ajouter le participant
                </button>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              {historyLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Chargement...
                </div>
              ) : !history || history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun historique
                </div>
              ) : (
                history.map((item: BookingHistory, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
                  >
                    <History
                      size={16}
                      className="text-gray-400 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusConfig[item.fromStatus]?.color || "bg-gray-100"}`}
                        >
                          {statusConfig[item.fromStatus]?.label ||
                            item.fromStatus}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusConfig[item.toStatus]?.color || "bg-gray-100"}`}
                        >
                          {statusConfig[item.toStatus]?.label || item.toStatus}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Par {item.changedBy} ·{" "}
                        {new Date(item.changedAt).toLocaleString("fr-FR")}
                      </p>
                      {item.reason && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Motif : {item.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "events" && (
            <div className="space-y-3">
              {eventsLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Chargement...
                </div>
              ) : !events || events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun événement
                </div>
              ) : (
                events.map((event: BookingEvent) => (
                  <div
                    key={event.eventNumber}
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
                  >
                    <Calendar
                      size={16}
                      className="text-gray-400 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.createdAt).toLocaleString("fr-FR")}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        {event.eventType}
                      </p>
                      {event.description && (
                        <p className="text-xs text-gray-400 mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {isInvoiceModalOpen && (
        <ModalPortal onClose={() => setIsInvoiceModalOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Facturer la réservation</h3>
            <button
              onClick={() => setIsInvoiceModalOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <XCircle size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p className="font-mono font-medium">{booking.bookingNumber}</p>
              <p className="text-gray-500">{booking.resourceName}</p>
              <p className="mt-1 font-semibold">
                {booking.totalAmount.toLocaleString("fr-FR")} {booking.currency}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de document
              </label>
              <select
                value={invoiceForm.documentType}
                onChange={(e) =>
                  setInvoiceForm((f) => ({
                    ...f,
                    documentType: e.target.value as
                      | "INVOICE"
                      | "PROFORMA_INVOICE",
                  }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="INVOICE">Facture</option>
                <option value="PROFORMA_INVOICE">Proforma</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'émission *
                </label>
                <input
                  type="date"
                  value={invoiceForm.issueDate}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({ ...f, issueDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'échéance
                </label>
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  min={invoiceForm.issueDate}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructions de paiement
              </label>
              <textarea
                value={invoiceForm.paymentInstructions}
                onChange={(e) =>
                  setInvoiceForm((f) => ({
                    ...f,
                    paymentInstructions: e.target.value,
                  }))
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes internes
              </label>
              <textarea
                value={invoiceForm.internalNotes}
                onChange={(e) =>
                  setInvoiceForm((f) => ({
                    ...f,
                    internalNotes: e.target.value,
                  }))
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                disabled={createInvoiceMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => createInvoiceMutation.mutate()}
                disabled={
                  createInvoiceMutation.isPending || !invoiceForm.issueDate
                }
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createInvoiceMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CreditCard size={16} />
                )}
                Générer la facture
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </AdminLayout>
  );
};
