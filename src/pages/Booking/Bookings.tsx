import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Ban,
  Calendar,
  CheckCircle,
  LogIn,
  LogOut,
  Play,
  Plus,
  UserX,
  XCircle,
} from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { BookingResponse } from "../../services/booking.service";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "../../components/ui/toastStore";
import { TableSkeleton } from "../../components/ui/Skeleton";
import {
  ActionButton,
  DataCard,
  EmptyState,
  Field,
  FilterButton,
  FilterPanel,
  HeadRow,
  IconButton,
  ListHeader,
  Pagination,
  SearchField,
  StatusChip,
  Tag,
} from "../../components/subscription/kit";
import {
  FIELD_SOFT,
  ROW_HOVER,
  apiMessage,
  formatDate,
  formatMoney,
} from "../../components/subscription/kitUtils";
import {
  BOOKING_STATUS,
  PAYMENT_MODE_LABELS,
  formatTime,
  statusOf,
} from "../../components/bookings/bookingLabels";
import { ReasonPanel } from "../../components/bookings/ReasonPanel";

const PAGE_SIZE = 20;

const COLS =
  "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_8.5rem_12rem]";

type ActionKey =
  | "confirm"
  | "approve"
  | "reject"
  | "start"
  | "checkIn"
  | "checkOut"
  | "complete"
  | "cancel"
  | "noShow";

interface RowAction {
  label: string;
  action: ActionKey;
  icon: React.ElementType;
  tone: "neutral" | "pink" | "success" | "danger";
}

const A: Record<ActionKey, RowAction> = {
  confirm: { label: "Confirmer", action: "confirm", icon: CheckCircle, tone: "success" },
  approve: { label: "Approuver", action: "approve", icon: CheckCircle, tone: "success" },
  reject: { label: "Rejeter", action: "reject", icon: XCircle, tone: "danger" },
  start: { label: "Démarrer", action: "start", icon: Play, tone: "pink" },
  checkIn: { label: "Check-in", action: "checkIn", icon: LogIn, tone: "pink" },
  checkOut: { label: "Check-out", action: "checkOut", icon: LogOut, tone: "pink" },
  complete: { label: "Terminer", action: "complete", icon: CheckCircle, tone: "success" },
  cancel: { label: "Annuler", action: "cancel", icon: Ban, tone: "danger" },
  noShow: { label: "No-show", action: "noShow", icon: UserX, tone: "danger" },
};

const actionsFor = (status: string): RowAction[] => {
  switch (status) {
    case "DRAFT":
      return [A.confirm, A.cancel];
    case "PENDING_APPROVAL":
      return [A.approve, A.reject];
    case "CONFIRMED":
      return [A.start, A.checkIn, A.noShow, A.cancel];
    case "IN_PROGRESS":
      return [A.checkOut, A.complete, A.noShow, A.cancel];
    case "REJECTED":
      return [A.cancel];
    default:
      return [];
  }
};

// Actions qui demandent un motif : true = obligatoire
const REASON: Partial<Record<ActionKey, boolean>> = {
  confirm: false,
  approve: false,
  reject: true,
  cancel: true,
};

const REASON_TITLE: Record<string, string> = {
  confirm: "Confirmer la réservation",
  approve: "Approuver la réservation",
  reject: "Rejeter la réservation",
  cancel: "Annuler la réservation",
};

const SUCCESS: Record<ActionKey, string> = {
  confirm: "Réservation confirmée",
  approve: "Réservation approuvée",
  reject: "Réservation rejetée",
  start: "Réservation démarrée",
  checkIn: "Check-in effectué",
  checkOut: "Check-out effectué",
  complete: "Réservation terminée",
  cancel: "Réservation annulée",
  noShow: "Non-présentation enregistrée",
};

const accessLabel = (b: BookingResponse): string => {
  if (b.subscriptionNumber) return b.subscriptionNumber;
  if (b.passNumber) return b.passNumber;
  if (b.entitlementCode) return b.entitlementCode;
  if (b.paymentMode === "SUBSCRIPTION") return "En attente d'activation";
  return "";
};

export const AdminBookings: React.FC = () => {
  const navigate = useNavigate();
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [reasonFor, setReasonFor] = useState<{ action: ActionKey; booking: BookingResponse } | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (reasonFor) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [reasonFor]);

  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ["bookings", page, statusFilter, resourceFilter, debouncedSearch],
    queryFn: () =>
      bookingService.getBookings({
        query: debouncedSearch || undefined,
        status: statusFilter || undefined,
        resourceCode: resourceFilter || undefined,
        page,
        size: PAGE_SIZE,
        sort: "startedAt,desc",
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["bookings"] });

  // Un seul point d'entrée : mêmes appels et mêmes données qu'avant pour chaque action
  const runAction = ({
    action,
    bookingNumber,
    reason,
  }: {
    action: ActionKey;
    bookingNumber: string;
    reason?: string;
  }) => {
    const by = admin?.email;
    switch (action) {
      case "confirm":
        return bookingService.confirmBooking(bookingNumber, { changedBy: by, reason, sendEmail: true });
      case "approve":
        return bookingService.approveBooking(bookingNumber, { changedBy: by, reason, sendEmail: true });
      case "reject":
        return bookingService.rejectBooking(bookingNumber, { changedBy: by, reason, sendEmail: true });
      case "start":
        return bookingService.startBooking(bookingNumber, { changedBy: by });
      case "checkIn":
        return bookingService.checkIn(bookingNumber, { actor: by });
      case "checkOut":
        return bookingService.checkOut(bookingNumber, { actor: by });
      case "complete":
        return bookingService.completeBooking(bookingNumber, { changedBy: by });
      case "cancel":
        return bookingService.cancelBooking(bookingNumber, { changedBy: by, reason, sendEmail: true });
      case "noShow":
        return bookingService.noShowBooking(bookingNumber, { changedBy: by });
    }
  };

  const actionMutation = useMutation({
    mutationFn: runAction,
    onSuccess: (_d, v) => {
      invalidate();
      setReasonFor(null);
      toast.success(SUCCESS[v.action]);
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "L'action a échoué.")),
  });

  // Actions confirmées par toast : le toast affiche lui-même le résultat
  const confirmedMutation = useMutation({
    mutationFn: runAction,
    onSuccess: invalidate,
  });

  const bookings: BookingResponse[] = bookingsData?.data || [];
  const totalPages = bookingsData?.pageable?.totalPages ?? 0;
  const totalElements = bookingsData?.pageable?.totalElements ?? 0;
  const busy = actionMutation.isPending;
  const hasActiveFilters = !!(statusFilter || resourceFilter || search);

  const handleReset = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("");
    setResourceFilter("");
    setPage(0);
  };

  const handleAction = (action: ActionKey, booking: BookingResponse) => {
    const bn = booking.bookingNumber;
    if (action in REASON) {
      setReasonFor({ action, booking });
      return;
    }
    if (action === "complete" || action === "noShow") {
      toast.confirm({
        message: action === "complete" ? "Marquer cette réservation comme terminée ?" : "Marquer comme non-présentation ?",
        detail: `${bn} · ${booking.resourceName || booking.resourceCode}`,
        confirmLabel: action === "complete" ? "Terminer" : "Marquer no-show",
        pendingLabel: "Enregistrement en cours",
        successMessage: SUCCESS[action],
        errorMessage: "L'action a échoué",
        tone: action === "complete" ? "primary" : "danger",
        onConfirm: async () => {
          await confirmedMutation.mutateAsync({ action, bookingNumber: bn });
        },
      });
      return;
    }
    actionMutation.mutate({ action, bookingNumber: bn });
  };

  const open = (b: BookingResponse) => navigate(`/bookings/${b.bookingNumber}`);

  const isRowPending = (b: BookingResponse, action: ActionKey) =>
    busy &&
    actionMutation.variables?.bookingNumber === b.bookingNumber &&
    actionMutation.variables?.action === action;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Réservations"
        subtitle={
          totalElements > 0
            ? `${totalElements.toLocaleString("fr-FR")} réservation${totalElements > 1 ? "s" : ""}`
            : undefined
        }
        action={
          <ActionButton icon={Plus} className="w-full sm:w-auto" onClick={() => navigate("/bookings/create")}>
            Nouvelle réservation
          </ActionButton>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField
          className="flex-1"
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par numéro, membre, contact..."
        />
        <FilterButton open={showFilters} active={hasActiveFilters} onClick={() => setShowFilters(!showFilters)} />
      </div>

      {showFilters && (
        <FilterPanel canReset={hasActiveFilters} onReset={handleReset}>
          <Field label="Statut">
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
              className={FIELD_SOFT}
            >
              <option value="">Tous les statuts</option>
              {Object.entries(BOOKING_STATUS).map(([value, cfg]) => (
                <option key={value} value={value}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Code ressource">
            <input
              value={resourceFilter}
              onChange={(e) => handleFilterChange(setResourceFilter, e.target.value)}
              placeholder="Ex : SALLE-A"
              className={FIELD_SOFT}
            />
          </Field>
        </FilterPanel>
      )}

      {reasonFor && (
        <div ref={panelRef}>
          <ReasonPanel
            title={REASON_TITLE[reasonFor.action]}
            subtitle={`${reasonFor.booking.bookingNumber} · ${reasonFor.booking.resourceName || reasonFor.booking.resourceCode}`}
            required={!!REASON[reasonFor.action]}
            submitLabel={REASON_TITLE[reasonFor.action].split(" ")[0]}
            pending={busy}
            onCancel={() => setReasonFor(null)}
            onSubmit={(reason) =>
              actionMutation.mutate({
                action: reasonFor.action,
                bookingNumber: reasonFor.booking.bookingNumber,
                reason: reason || undefined,
              })
            }
          />
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Aucune réservation trouvée"
          action={
            hasActiveFilters ? (
              <ActionButton variant="ghost" onClick={handleReset}>
                Réinitialiser les filtres
              </ActionButton>
            ) : undefined
          }
        />
      ) : (
        <DataCard>
          <HeadRow cols={COLS}>
            <span>Réservation</span>
            <span>Ressource</span>
            <span>Client</span>
            <span>Date et horaire</span>
            <span>Montant</span>
            <span>Statut</span>
            <span />
          </HeadRow>

          <div className="space-y-2">
            {bookings.map((b) => {
              const st = statusOf(BOOKING_STATUS, b.status);
              const actions = actionsFor(b.status);
              const mode = PAYMENT_MODE_LABELS[b.paymentMode] ?? b.paymentMode;
              const access = accessLabel(b);
              const slot = `${formatTime(b.startedAt)} - ${formatTime(b.endedAt)}`;
              return (
                <div
                  key={b.bookingNumber}
                  onClick={() => open(b)}
                  className={`cursor-pointer rounded-2xl bg-gray-50 p-3 ${ROW_HOVER}`}
                >
                  {/* Desktop */}
                  <div className={`hidden items-center gap-4 px-1 lg:grid ${COLS}`}>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">
                        {b.bookingNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">Créée le {formatDate(b.createdAt)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{b.resourceName}</p>
                      <p className="mt-0.5 truncate font-mono text-xs text-gray-400">
                        {b.resourceCode}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-900">{b.ownerName || b.ownerCode}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-400">{b.contactEmail || access}</p>
                    </div>
                    <div className="text-sm text-gray-700">
                      <p>{formatDate(b.startedAt)}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{slot}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{formatMoney(b.totalAmount, b.currency || "FCFA")}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{mode}</p>
                    </div>
                    <span>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </span>
                    <div className="flex flex-wrap justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                      {actions.map((a) => (
                        <IconButton
                          key={a.action}
                          icon={a.icon}
                          label={a.label}
                          tone={a.tone}
                          disabled={busy}
                          pending={isRowPending(b, a.action)}
                          onClick={() => handleAction(a.action, b)}
                        />
                      ))}
                      <IconButton icon={ArrowUpRight} label="Voir la réservation" onClick={() => open(b)} />
                    </div>
                  </div>

                  {/* Mobile et tablette */}
                  <div className="lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{b.resourceName || b.resourceCode}</p>
                        <p className="mt-0.5 font-mono text-xs text-gray-500">{b.bookingNumber}</p>
                      </div>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </div>
                    <p className="mt-2 truncate text-sm text-gray-700">{b.ownerName || b.ownerCode}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDate(b.startedAt)} · {slot}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Tag>{mode}</Tag>
                      <span className="text-sm font-bold text-gray-900">
                        {formatMoney(b.totalAmount, b.currency || "FCFA")}
                      </span>
                    </div>
                    <div
                      className="mt-3 flex flex-wrap items-center justify-end gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actions.map((a) => (
                        <IconButton
                          key={a.action}
                          icon={a.icon}
                          label={a.label}
                          tone={a.tone}
                          disabled={busy}
                          pending={isRowPending(b, a.action)}
                          onClick={() => handleAction(a.action, b)}
                        />
                      ))}
                      <IconButton icon={ArrowUpRight} label="Voir la réservation" onClick={() => open(b)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={totalElements}
        noun="réservation"
        onChange={setPage}
      />
    </div>
  );
};
