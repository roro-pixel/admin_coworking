import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, LogIn, QrCode, RefreshCw, Search } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { BookingResponse } from "../../services/booking.service";
import { toast } from "../../components/ui/toastStore";
import {
  ActionButton,
  CheckField,
  Detail,
  EmptyState,
  Field,
  ListHeader,
  Section,
  StatusChip,
} from "../../components/subscription/kit";
import { FIELD, FOCUS, apiMessage, formatDateTime } from "../../components/subscription/kitUtils";
import { BOOKING_STATUS, extractAccessCode, statusOf } from "../../components/bookings/bookingLabels";

export const BookingCheckInTerminal: React.FC = () => {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [accessCode, setAccessCode] = useState("");
  const [actor, setActor] = useState("reception");
  const [note, setNote] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [lastBooking, setLastBooking] = useState<BookingResponse | null>(null);

  const normalizedCode = useMemo(() => extractAccessCode(accessCode), [accessCode]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    if (lastBooking?.bookingNumber) {
      queryClient.invalidateQueries({ queryKey: ["booking", lastBooking.bookingNumber] });
    }
  };

  const checkInByCodeMutation = useMutation({
    mutationFn: () =>
      bookingService.checkInByQrToken(normalizedCode, {
        actor: actor || "reception",
        note: note || undefined,
        sendEmail,
      }),
    onSuccess: (booking) => {
      setLastBooking(booking);
      setAccessCode("");
      setNote("");
      toast.success(`Check-in validé : ${booking.bookingNumber}`);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking", booking.bookingNumber] });
      setTimeout(() => inputRef.current?.focus(), 120);
    },
    onError: (error: unknown) => {
      toast.error(apiMessage(error, "Code d'accès invalide ou check-in impossible."));
    },
  });

  // Confirmé par toast : le toast affiche lui-même le résultat
  const earlyCheckInMutation = useMutation({
    mutationFn: () => {
      if (!lastBooking?.bookingNumber) {
        throw new Error("Aucune réservation chargée.");
      }
      return bookingService.earlyCheckIn(lastBooking.bookingNumber, {
        actor: actor || "reception",
        note: note || "Check-in anticipé depuis l'accueil",
        sendEmail,
      });
    },
    onSuccess: (booking) => {
      setLastBooking(booking);
      invalidate();
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!normalizedCode) {
      toast.error("Scannez ou saisissez le code d'accès.");
      inputRef.current?.focus();
      return;
    }
    checkInByCodeMutation.mutate();
  };

  const isPending = checkInByCodeMutation.isPending || earlyCheckInMutation.isPending;

  const askEarly = () =>
    toast.confirm({
      message: "Forcer le check-in anticipé sur cette réservation ?",
      detail: lastBooking?.bookingNumber,
      confirmLabel: "Forcer le check-in",
      pendingLabel: "Check-in en cours",
      successMessage: "Check-in anticipé validé",
      errorMessage: "Impossible d'effectuer le check-in anticipé",
      tone: "primary",
      onConfirm: () => earlyCheckInMutation.mutateAsync(),
    });

  const st = lastBooking ? statusOf(BOOKING_STATUS, lastBooking.status) : null;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Check-in par QR ou code d'accès"
        subtitle="Scannez le QR code du membre ou saisissez le code affiché dans son portail. Une URL complète de QR code est aussi acceptée."
        action={
          <ActionButton variant="ghost" icon={QrCode} onClick={() => inputRef.current?.focus()}>
            Prêt à scanner
          </ActionButton>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Section title="Saisie du code" description="Le lecteur QR agit comme un clavier : scannez puis validez." icon={QrCode}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Code d'accès ou URL QR"
              hint={
                normalizedCode && normalizedCode !== accessCode.trim()
                  ? `Code détecté : ${normalizedCode}`
                  : undefined
              }
            >
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  ref={inputRef}
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  className={`${FIELD} pl-10`}
                  placeholder="Ex : CHK-9K2L... ou https://.../scan/CHK-9K2L"
                  autoFocus
                  autoComplete="off"
                />
              </div>
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Agent">
                <input
                  value={actor}
                  onChange={(event) => setActor(event.target.value)}
                  className={FIELD}
                  placeholder="reception"
                />
              </Field>
              <Field label="Note">
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className={FIELD}
                  placeholder="Ex : arrivée à l'accueil"
                />
              </Field>
            </div>
            <CheckField
              checked={sendEmail}
              onChange={setSendEmail}
              label="Envoyer une notification email si le backend le permet"
            />
            <ActionButton
              type="submit"
              icon={LogIn}
              className="w-full"
              disabled={isPending || !normalizedCode}
              pending={checkInByCodeMutation.isPending}
            >
              Valider le check-in
            </ActionButton>
          </form>
        </Section>

        <div className="space-y-5">
          {lastBooking && st ? (
            <Section
              title="Dernier passage"
              action={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
            >
              <p className="font-mono text-sm font-bold text-[color:var(--logo-pink-dark)]">
                {lastBooking.bookingNumber}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Detail label="Client">{lastBooking.ownerName || lastBooking.ownerCode}</Detail>
                <Detail label="Ressource">{lastBooking.resourceName}</Detail>
                <Detail label="Début">{formatDateTime(lastBooking.startedAt)}</Detail>
                <Detail label="Fin">{formatDateTime(lastBooking.endedAt)}</Detail>
                <Detail label="Check-in">{formatDateTime(lastBooking.checkedInAt)}</Detail>
              </div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <ActionButton
                  variant="ghost"
                  icon={RefreshCw}
                  className="flex-1"
                  disabled={isPending}
                  onClick={askEarly}
                >
                  Check-in anticipé
                </ActionButton>
                <Link
                  to={`/bookings/${lastBooking.bookingNumber}`}
                  className={`flex-1 rounded-full bg-[color:var(--logo-pink-dark)] px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90 ${FOCUS}`}
                >
                  Ouvrir la réservation
                </Link>
              </div>
            </Section>
          ) : (
            <EmptyState icon={QrCode} title="Aucun check-in traité sur ce poste pour l'instant" />
          )}

          <Section title="Règles appliquées" description="Contrôlées par le serveur">
            <ul className="space-y-2">
              {[
                "Check-in standard par code QR ou token côté admin.",
                "Check-in anticipé disponible depuis la dernière réservation chargée.",
                "Les erreurs du serveur s'affichent dans une notification.",
              ].map((text) => (
                <li key={text} className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-sm">
                  <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span className="text-sm text-gray-600">{text}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
};
