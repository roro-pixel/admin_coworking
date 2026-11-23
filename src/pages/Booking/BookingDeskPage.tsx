import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, LogIn, LogOut, UserX } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { PlanningItem } from "../../services/booking.service";
import { EmptyState, ErrorBlock, IconButton, ListHeader, Section, StatusChip } from "../../components/subscription/kit";
import { FIELD, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { RefreshButton } from "../../components/reporting/reportKit";
import { ResourceAutocomplete } from "../../components/resources/ResourceAutocomplete";
import { useAuth } from "../../contexts/AuthContext";
import { BookingStatusChip, errorReason, errorText, hm, todayIso } from "../../components/bookings/bookingKit";

const Counter: React.FC<{ title: string; value: number; tone?: string }> = ({ title, value, tone = "text-gray-950" }) => (
  <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold text-gray-400">{title}</p>
    <p className={`mt-1 text-2xl font-black ${tone}`}>{value}</p>
  </div>
);

/** Accueil du jour : planning par ressource, retards, encaissements à faire. Se rafraîchit chaque minute. */
export const BookingDeskPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canCheckIn = hasPermission("BOOKING:CHECKIN");
  const canCancel = hasPermission("BOOKING:CANCEL");
  const [date, setDate] = useState(todayIso());
  const [resourceCode, setResourceCode] = useState("");

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["booking-planning", date, resourceCode],
    queryFn: () => bookingService.getPlanning({ date, resourceCode }),
    refetchInterval: 60_000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["booking-planning"] });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
  };

  const checkIn = useMutation({
    mutationFn: (n: string) => bookingService.checkIn(n),
    onSuccess: () => {
      toast.success("Arrivée enregistrée");
      refresh();
    },
    onError: (e, n) => {
      if (errorReason(e) === "CHECKIN_OUTSIDE_WINDOW") {
        toast.confirm({
          message: "Hors de la fenêtre d'arrivée",
          detail: errorText(e, "Enregistrer l'arrivée anticipée ?"),
          confirmLabel: "Arrivée anticipée",
          successMessage: "Arrivée enregistrée",
          errorMessage: "Arrivée impossible",
          onConfirm: async () => {
            await bookingService.earlyCheckIn(n);
            refresh();
          },
        });
      } else toast.error(apiMessage(e, "Arrivée impossible"));
    },
  });
  const checkOut = useMutation({
    mutationFn: (n: string) => bookingService.checkOut(n),
    onSuccess: () => {
      toast.success("Départ enregistré");
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Départ impossible")),
  });

  const noShow = (it: PlanningItem) =>
    toast.confirm({
      tone: "danger",
      message: `Déclarer ${it.contactName || it.bookingNumber} absent ?`,
      confirmLabel: "Déclarer l'absence",
      successMessage: "Absence enregistrée",
      errorMessage: "Action impossible",
      onConfirm: async () => {
        await bookingService.noShowBooking(it.bookingNumber);
        refresh();
      },
    });

  const resources = data?.resources ?? [];
  return (
    <div className="space-y-5">
      <ListHeader
        title="Accueil du jour"
        subtitle="Arrivées, retards et encaissements à faire. Actualisé chaque minute."
        action={<RefreshButton fetching={isFetching} onClick={() => refetch()} />}
      />
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value || todayIso())} className={FIELD} aria-label="Date" />
        <ResourceAutocomplete selectedCode={resourceCode} onSelect={(r) => setResourceCode(r?.code ?? "")} placeholder="Toutes les ressources" />
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : isError || !data ? (
        <ErrorBlock message="Impossible de charger le planning." onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Counter title="Réservations" value={data.bookings} />
            <Counter title="Arrivés" value={data.arrived} tone="text-emerald-600" />
            <Counter title="En retard" value={data.late} tone={data.late ? "text-red-600" : undefined} />
            <Counter title="À encaisser" value={data.toCollect} tone={data.toCollect ? "text-amber-600" : undefined} />
          </div>

          {resources.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="Rien de prévu ce jour" />
          ) : (
            resources.map((r) => (
              <Section key={r.resourceCode} title={r.resourceName || r.resourceCode} description={r.resourceCode}>
                <div className="space-y-2">
                  {r.bookings.map((it) => (
                    <div key={it.bookingNumber} className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                      <button type="button" onClick={() => navigate(`/bookings/${it.bookingNumber}`)} className="min-w-0 text-left">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {hm(it.startedAt)} - {hm(it.endedAt)} · {it.contactName || "Sans nom"}
                        </p>
                        <p className="font-mono text-xs text-gray-500">
                          {it.bookingNumber}
                          {it.contactPhone ? ` · ${it.contactPhone}` : ""}
                          {it.checkedInAt ? ` · arrivé à ${hm(it.checkedInAt)}` : ""}
                        </p>
                      </button>
                      <div className="flex flex-wrap items-center gap-2">
                        <BookingStatusChip status={it.status} />
                        {it.late && <StatusChip tone="danger">En retard{it.lateMinutes ? ` de ${it.lateMinutes} min` : ""}</StatusChip>}
                        {it.payOnSite && it.paymentStatus === "PENDING" && <StatusChip tone="warn">À encaisser</StatusChip>}
                        {it.attendanceAnswer === "CONFIRMED" && <StatusChip tone="success">Venue confirmée</StatusChip>}
                        {it.attendanceAnswer === "DECLINED" && <StatusChip tone="danger">Ne viendra pas</StatusChip>}
                        {canCheckIn && it.status === "CONFIRMED" && <IconButton icon={LogIn} label="Arrivée" tone="success" pending={checkIn.isPending && checkIn.variables === it.bookingNumber} onClick={() => checkIn.mutate(it.bookingNumber)} />}
                        {canCheckIn && it.status === "IN_PROGRESS" && <IconButton icon={LogOut} label="Départ" pending={checkOut.isPending && checkOut.variables === it.bookingNumber} onClick={() => checkOut.mutate(it.bookingNumber)} />}
                        {canCancel && (it.status === "CONFIRMED" || it.status === "IN_PROGRESS") && <IconButton icon={UserX} label="Absence" tone="danger" onClick={() => noShow(it)} />}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            ))
          )}
        </>
      )}
    </div>
  );
};

export default BookingDeskPage;
