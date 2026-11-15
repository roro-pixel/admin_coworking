import React, { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bell, Clock, Eye, RefreshCw, Users, XCircle } from "lucide-react";
import { waitlistService } from "../../services/waitlist.service";
import { bookingService } from "../../services/booking.service";
import type {
  WaitlistAlternative,
  WaitlistEntry,
  WaitlistStatus,
} from "../../services/waitlist.service";
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
  OWNER_TYPE_LABELS,
  PAYMENT_MODE_LABELS,
  WAITLIST_STATUS,
  formatTime,
  statusOf,
} from "../../components/bookings/bookingLabels";

const COLS =
  "lg:grid-cols-[4rem_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_9rem_minmax(0,1.1fr)_5.5rem]";

// Identité envoyée au serveur, construite comme avant à partir de l'entrée
const buildIdentity = (entry: WaitlistEntry) => {
  const identityLookup: any = {};
  if (entry.ownerCode) {
    if (entry.ownerType === "MEMBER")
      identityLookup.memberId = parseInt(entry.ownerCode.replace(/\D/g, "")) || entry.ownerCode;
    else if (entry.ownerType === "CUSTOMER") identityLookup.customerId = entry.ownerCode;
    else if (entry.ownerType === "BUSINESS") identityLookup.businessCode = entry.ownerCode;
  }
  if (entry.contactEmail) identityLookup.email = entry.contactEmail;
  if (entry.contactPhone) identityLookup.phone = entry.contactPhone;
  return identityLookup;
};

const clientName = (e: WaitlistEntry): string => e.ownerName || e.contactName || e.ownerCode || "";

export const WaitlistManager: React.FC = () => {
  const queryClient = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);

  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | "">("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [bookingIdx, setBookingIdx] = useState<number | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["waitlist-entries", statusFilter, resourceFilter],
    queryFn: () =>
      waitlistService.getWaitlistEntries({
        status: statusFilter || undefined,
        resourceCode: resourceFilter || undefined,
        page: 0,
        size: 50,
      }),
  });

  const promoteMutation = useMutation({
    mutationFn: (limit: number) => waitlistService.promoteAvailable({ limit, dryRun: false }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["waitlist-entries"] });
      toast.success(`${result.promotedCount} créneau(x) disponible(s) ont été promus.`);
    },
    onError: (error: unknown) => toast.error(apiMessage(error, "Erreur lors de la promotion")),
  });

  const expireMutation = useMutation({
    mutationFn: (limit: number) => waitlistService.expireOffers({ limit, dryRun: false }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["waitlist-entries"] });
      toast.success(`${result.expiredCount} offre(s) expirée(s) ont été traitées.`);
    },
    onError: (error: unknown) => toast.error(apiMessage(error, "Erreur lors de l'expiration")),
  });

  // Confirmé par toast : le toast affiche lui-même le résultat
  const cancelMutation = useMutation({
    mutationFn: (id: number) => waitlistService.cancelWaitlistEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist-entries"] });
      setSelectedEntry(null);
    },
  });

  const askCancel = (entry: WaitlistEntry) =>
    toast.confirm({
      message: "Annuler cette entrée en liste d'attente ?",
      detail: clientName(entry),
      confirmLabel: "Annuler l'entrée",
      pendingLabel: "Annulation en cours",
      successMessage: "Entrée annulée",
      errorMessage: "L'annulation a échoué",
      onConfirm: () => cancelMutation.mutateAsync(entry.id),
    });

  const handleViewAlternatives = async (entry: WaitlistEntry) => {
    setLoadingId(entry.id);
    let alternatives: WaitlistAlternative[] = [];
    try {
      alternatives = await waitlistService.getAlternatives({
        resourceCode: entry.resourceCode,
        identityLookup: buildIdentity(entry),
        startedAt: entry.startedAt,
        endedAt: entry.endedAt,
        quantity: 1,
        paymentMode: entry.paymentMode,
        contactName: entry.contactName,
        contactEmail: entry.contactEmail,
        contactPhone: entry.contactPhone,
      });
    } catch {
      alternatives = [];
    }
    setSelectedEntry({ ...entry, alternatives });
    setLoadingId(null);
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const handleBookAlternative = async (alternative: WaitlistAlternative, idx: number) => {
    if (!selectedEntry) return;
    setBookingIdx(idx);
    try {
      const booking = await bookingService.createBooking({
        resourceCode: alternative.resourceCode,
        startedAt: alternative.startedAt,
        endedAt: alternative.endedAt,
        quantity: 1,
        paymentMode: selectedEntry.paymentMode,
        confirmImmediately: true,
        sendEmail: true,
        contactName: selectedEntry.contactName,
        contactEmail: selectedEntry.contactEmail,
        contactPhone: selectedEntry.contactPhone,
        ...buildIdentity(selectedEntry),
      });
      await waitlistService.cancelWaitlistEntry(selectedEntry.id);
      toast.success(`Réservation ${booking.bookingNumber} créée. L'entrée en liste d'attente a été annulée.`);
      queryClient.invalidateQueries({ queryKey: ["waitlist-entries"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setSelectedEntry(null);
    } catch (error: unknown) {
      toast.error(apiMessage(error, "Erreur lors de la réservation alternative"));
    } finally {
      setBookingIdx(null);
    }
  };

  const entries: WaitlistEntry[] = data?.content || [];
  const totalElements = data?.totalElements || 0;
  const hasActiveFilters = !!(statusFilter || resourceFilter);
  const handleReset = () => {
    setStatusFilter("");
    setResourceFilter("");
  };

  return (
    <div className="space-y-5">
      <ListHeader
        title="Liste d'attente"
        subtitle={
          totalElements > 0 ? `${totalElements} entrée${totalElements > 1 ? "s" : ""}` : undefined
        }
        action={
          <div className="flex flex-wrap gap-2">
            <ActionButton
              icon={Bell}
              pending={promoteMutation.isPending}
              disabled={expireMutation.isPending}
              onClick={() => promoteMutation.mutate(50)}
            >
              Promouvoir disponibles
            </ActionButton>
            <ActionButton
              variant="ghost"
              icon={Clock}
              pending={expireMutation.isPending}
              disabled={promoteMutation.isPending}
              onClick={() => expireMutation.mutate(50)}
            >
              Expirer offres
            </ActionButton>
            <ActionButton
              variant="ghost"
              icon={RefreshCw}
              pending={isFetching && !isLoading}
              onClick={() => refetch()}
            >
              Actualiser
            </ActionButton>
          </div>
        }
      />

      <div className="flex justify-end">
        <FilterButton open={showFilters} active={hasActiveFilters} onClick={() => setShowFilters(!showFilters)} />
      </div>

      {showFilters && (
        <FilterPanel canReset={hasActiveFilters} onReset={handleReset}>
          <Field label="Statut">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as WaitlistStatus | "")}
              className={FIELD_SOFT}
            >
              <option value="">Tous les statuts</option>
              {Object.entries(WAITLIST_STATUS).map(([value, cfg]) => (
                <option key={value} value={value}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Code ressource">
            <input
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              placeholder="Ex : SALLE-A"
              className={FIELD_SOFT}
            />
          </Field>
        </FilterPanel>
      )}

      {selectedEntry && (
        <div
          ref={panelRef}
          className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-2 ring-[color:color-mix(in_srgb,var(--logo-pink)_30%,white)] sm:p-5"
        >
          <h4 className="text-base font-bold text-gray-950">Créneaux alternatifs</h4>
          <div className="mt-3 rounded-2xl bg-gray-50 p-4 text-sm">
            <p className="text-xs font-semibold text-gray-400">Demande originale</p>
            <p className="mt-1 font-semibold text-gray-900">{selectedEntry.resourceName}</p>
            <p className="text-gray-600">
              {formatDate(selectedEntry.startedAt)} · {formatTime(selectedEntry.startedAt)} -{" "}
              {formatTime(selectedEntry.endedAt)}
            </p>
            <p className="text-gray-600">{clientName(selectedEntry)}</p>
          </div>

          <p className="mb-2 mt-4 text-sm font-semibold text-gray-700">
            {selectedEntry.alternatives?.length || 0} créneau(x) alternatif(s) disponible(s)
          </p>

          {selectedEntry.alternatives && selectedEntry.alternatives.length > 0 ? (
            <div className="space-y-2">
              {selectedEntry.alternatives.map((alt, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-gray-900">
                      {new Date(alt.startedAt).toLocaleString("fr-FR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <ArrowRight size={13} className="text-gray-400" />
                      {formatTime(alt.endedAt)}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-600">{alt.resourceName}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {alt.remainingCapacity} place(s) · score {alt.score}% ·{" "}
                      <span className="font-semibold text-gray-800">{formatMoney(alt.estimatedAmount)}</span>
                    </p>
                    {alt.reason && <p className="mt-0.5 text-xs text-gray-400">{alt.reason}</p>}
                  </div>
                  <ActionButton
                    className="w-full shrink-0 sm:w-auto"
                    pending={bookingIdx === idx}
                    disabled={bookingIdx !== null}
                    onClick={() => handleBookAlternative(alt, idx)}
                  >
                    Réserver
                  </ActionButton>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-gray-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-gray-600">Aucun créneau alternatif trouvé pour le moment.</p>
              <p className="mt-1 text-xs text-gray-400">Le client reste en liste d'attente.</p>
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" onClick={() => setSelectedEntry(null)} disabled={bookingIdx !== null}>
              Fermer
            </ActionButton>
            <ActionButton
              variant="danger"
              icon={XCircle}
              disabled={bookingIdx !== null}
              onClick={() => askCancel(selectedEntry)}
            >
              Annuler la liste d'attente
            </ActionButton>
          </div>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : entries.length === 0 ? (
        <EmptyState icon={Users} title="Aucune entrée en liste d'attente" />
      ) : (
        <DataCard>
          <HeadRow cols={COLS}>
            <span>ID</span>
            <span>Client</span>
            <span>Ressource</span>
            <span>Créneau demandé</span>
            <span>Mode</span>
            <span>Statut</span>
            <span>Offre</span>
            <span />
          </HeadRow>

          <div className="space-y-2">
            {entries.map((entry) => {
              const st = statusOf(WAITLIST_STATUS, entry.status);
              const mode = PAYMENT_MODE_LABELS[entry.paymentMode] ?? entry.paymentMode;
              const slot = `${formatTime(entry.startedAt)} - ${formatTime(entry.endedAt)}`;
              const canAct = entry.status === "WAITING";
              const actions = canAct ? (
                <>
                  <IconButton
                    icon={Eye}
                    label="Voir les créneaux alternatifs"
                    pending={loadingId === entry.id}
                    disabled={loadingId !== null}
                    onClick={() => handleViewAlternatives(entry)}
                  />
                  <IconButton
                    icon={XCircle}
                    label="Annuler l'entrée"
                    tone="danger"
                    disabled={cancelMutation.isPending}
                    onClick={() => askCancel(entry)}
                  />
                </>
              ) : null;
              return (
                <div key={entry.id} className={`rounded-2xl bg-gray-50 p-3 ${ROW_HOVER}`}>
                  {/* Desktop */}
                  <div className={`hidden items-center gap-4 px-1 lg:grid ${COLS}`}>
                    <span className="font-mono text-xs text-gray-500">{entry.id}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{clientName(entry)}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {OWNER_TYPE_LABELS[entry.ownerType] ?? entry.ownerType}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-900">{entry.resourceName}</p>
                      <p className="mt-0.5 truncate font-mono text-xs text-gray-400">{entry.resourceCode}</p>
                    </div>
                    <div className="text-sm text-gray-700">
                      <p>{formatDate(entry.startedAt)}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{slot}</p>
                    </div>
                    <span className="truncate text-sm text-gray-700">{mode}</span>
                    <span>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </span>
                    <div className="text-xs text-gray-500">
                      {entry.offeredAt && <p>Offerte le {formatDate(entry.offeredAt)}</p>}
                      {entry.expiresAt && <p className="text-amber-600">Expire le {formatDate(entry.expiresAt)}</p>}
                    </div>
                    <div className="flex justify-end gap-0.5">{actions}</div>
                  </div>

                  {/* Mobile et tablette */}
                  <div className="lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{clientName(entry)}</p>
                        <p className="mt-0.5 font-mono text-xs text-gray-500">#{entry.id}</p>
                      </div>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </div>
                    <p className="mt-2 truncate text-sm text-gray-700">{entry.resourceName}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDate(entry.startedAt)} · {slot}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Tag>{mode}</Tag>
                      {entry.expiresAt && (
                        <span className="text-xs text-amber-600">Expire le {formatDate(entry.expiresAt)}</span>
                      )}
                    </div>
                    {actions && <div className="mt-3 flex justify-end gap-0.5">{actions}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>
      )}
    </div>
  );
};
