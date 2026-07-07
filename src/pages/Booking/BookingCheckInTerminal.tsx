import React, { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle,
  Keyboard,
  Loader2,
  LogIn,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import { bookingService } from "../../services/booking.service";
import type { BookingResponse } from "../../services/booking.service";

const inputClass =
  "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100";

const extractAccessCode = (rawValue: string): string => {
  const value = rawValue.trim();

  if (!value) return "";

  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || value;
  } catch {
    const cleaned = value.replace(/^.*\/check-in\/scan\//i, "");
    return cleaned.split(/[?#]/)[0].trim();
  }
};

const formatDateTime = (value?: string): string =>
  value
    ? new Date(value).toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING_APPROVAL: "En attente",
  REJECTED: "Rejetée",
  CONFIRMED: "Confirmée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  NO_SHOW: "Non présent",
  EXPIRED: "Expirée",
};

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
      queryClient.invalidateQueries({
        queryKey: ["booking", lastBooking.bookingNumber],
      });
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
      queryClient.invalidateQueries({
        queryKey: ["booking", booking.bookingNumber],
      });
      setTimeout(() => inputRef.current?.focus(), 120);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Code d'accès invalide ou check-in impossible.",
      );
    },
  });

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
      toast.success(`Check-in anticipé validé : ${booking.bookingNumber}`);
      invalidate();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Impossible d'effectuer le check-in anticipé.",
      );
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

  const isPending =
    checkInByCodeMutation.isPending || earlyCheckInMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-gray-100 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-600">
              Accueil
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-gray-950 sm:text-2xl">
              Check-in par QR ou code d'accès
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
              Scannez le QR code présenté par le membre ou saisissez le code
              d'accès affiché dans son portail. Le terminal accepte aussi une
              URL complète de QR code.
            </p>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.focus()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50"
          >
            <QrCode size={17} />
            Prêt à scanner
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-gray-100 md:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-2xl bg-primary-50 p-3 text-primary-600">
              <Keyboard size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-950">
                Saisie du code
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Le lecteur QR agit comme un clavier : scannez puis validez.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-gray-700">
                Code d'accès ou URL QR
              </span>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  ref={inputRef}
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  className={`${inputClass} pl-11`}
                  placeholder="Ex : CHK-9K2L... ou https://.../scan/CHK-9K2L"
                  autoFocus
                  autoComplete="off"
                />
              </div>
              {normalizedCode && normalizedCode !== accessCode.trim() && (
                <p className="mt-2 text-xs font-semibold text-gray-500">
                  Code détecté :{" "}
                  <span className="font-mono text-primary-700">
                    {normalizedCode}
                  </span>
                </p>
              )}
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-gray-700">
                  Agent
                </span>
                <input
                  value={actor}
                  onChange={(event) => setActor(event.target.value)}
                  className={inputClass}
                  placeholder="reception"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-gray-700">
                  Note
                </span>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className={inputClass}
                  placeholder="Ex : arrivée à l'accueil"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(event) => setSendEmail(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Envoyer une notification email si le backend le permet
            </label>

            <button
              type="submit"
              disabled={isPending || !normalizedCode}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-black text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {checkInByCodeMutation.isPending ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <LogIn size={17} />
              )}
              Valider le check-in
            </button>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-gray-100 md:p-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-2xl bg-green-50 p-3 text-green-700">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-950">
                  Règles appliquées
                </h3>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Le backend contrôle la fenêtre de check-in, le statut de la
                  réservation et les règles de présence configurées.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <Rule text="Check-in standard par code QR/token côté admin." />
              <Rule text="Check-in anticipé disponible depuis la dernière réservation chargée." />
              <Rule text="Les erreurs serveur sont affichées dans le toast." />
            </div>
          </section>

          {lastBooking ? (
            <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-gray-100 md:p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                    Dernier passage
                  </p>
                  <h3 className="mt-1 text-xl font-black text-gray-950">
                    {lastBooking.bookingNumber}
                  </h3>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  {statusLabels[lastBooking.status] || lastBooking.status}
                </span>
              </div>

              <div className="grid gap-3">
                <InfoRow label="Client" value={lastBooking.ownerName || lastBooking.ownerCode} />
                <InfoRow label="Ressource" value={lastBooking.resourceName} />
                <InfoRow label="Début" value={formatDateTime(lastBooking.startedAt)} />
                <InfoRow label="Fin" value={formatDateTime(lastBooking.endedAt)} />
                {lastBooking.checkedInAt && (
                  <InfoRow
                    label="Check-in"
                    value={formatDateTime(lastBooking.checkedInAt)}
                  />
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Forcer le check-in anticipé sur cette réservation ?",
                      )
                    ) {
                      earlyCheckInMutation.mutate();
                    }
                  }}
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {earlyCheckInMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Check-in anticipé
                </button>

                <a
                  href={`/bookings/${lastBooking.bookingNumber}`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-black text-white transition hover:bg-gray-800"
                >
                  Ouvrir la réservation
                </a>
              </div>
            </section>
          ) : (
            <section className="rounded-[1.75rem] bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-bold text-gray-500">
                Aucun check-in traité sur ce poste pour l'instant.
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

function Rule({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3">
      <CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
      <p className="font-semibold leading-6 text-gray-600">{text}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-gray-400">
        {label}
      </span>
      <span className="text-right text-sm font-black text-gray-900">
        {value || "—"}
      </span>
    </div>
  );
}
