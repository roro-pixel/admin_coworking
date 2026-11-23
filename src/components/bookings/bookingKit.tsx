import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { BookingReference, LookupItem, ReferenceValue } from "../../services/booking.service";
import { StatusChip } from "../subscription/kit";
import { FIELD, formatMoney } from "../subscription/kitUtils";
import type { Tone } from "../subscription/kitUtils";
import { useDebounced } from "../resources/resKit";

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING_APPROVAL: "En attente d'approbation",
  PENDING_PAYMENT: "En attente de paiement",
  REJECTED: "Refusée",
  CONFIRMED: "Confirmée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  NO_SHOW: "Absence",
  EXPIRED: "Expirée",
};

export const STATUS_TONE: Record<string, Tone> = {
  DRAFT: "neutral",
  PENDING_APPROVAL: "warn",
  PENDING_PAYMENT: "warn",
  REJECTED: "danger",
  CONFIRMED: "success",
  IN_PROGRESS: "info",
  COMPLETED: "neutral",
  CANCELLED: "danger",
  NO_SHOW: "danger",
  EXPIRED: "neutral",
};

export const STATUSES = Object.keys(STATUS_LABEL);

export const PAYMENT_MODE_LABEL: Record<string, string> = {
  DIRECT: "Paiement direct",
  WALLET: "Portefeuille",
  SUBSCRIPTION: "Abonnement",
  PASS: "Pass",
};

export const PAYMENT_STATUS_TONE: Record<string, Tone> = { COVERED: "info", PENDING: "warn", PAID: "success", CANCELLED: "neutral" };

export const CHANNEL_LABEL: Record<string, string> = {
  PORTAL: "Portail",
  TEAM: "Équipe",
  PHONE: "Téléphone",
  DESK: "Accueil",
  EMAIL: "Courriel",
  WHATSAPP: "WhatsApp",
};
/** Canaux que l'équipe peut choisir à la saisie (PORTAL et TEAM sont posés par le serveur). */
export const TEAM_CHANNELS = ["PHONE", "DESK", "EMAIL", "WHATSAPP"] as const;

export const UNIT_LABEL: Record<string, string> = { HOUR: "Heure", HALF_DAY: "Demi-journée", DAY: "Jour", WEEK: "Semaine", MONTH: "Mois" };

export const OWNER_LABEL: Record<string, string> = { MEMBER: "Membre", CUSTOMER: "Client", BUSINESS_ENTITY: "Entreprise" };

export const ROLE_LABEL: Record<string, string> = { HOST: "Hôte", GUEST: "Invité", ORGANIZER: "Organisateur", MEMBER: "Membre" };
export const PARTICIPANT_STATUS_LABEL: Record<string, string> = { INVITED: "Invité", CONFIRMED: "Vient", DECLINED: "Ne vient pas", REMOVED: "Retiré" };

export const WAITLIST_LABEL: Record<string, string> = { WAITING: "En attente", OFFERED: "Offre en cours", BOOKED: "Réservée", CANCELLED: "Annulée", EXPIRED: "Expirée" };
export const WAITLIST_TONE: Record<string, Tone> = { WAITING: "warn", OFFERED: "info", BOOKED: "success", CANCELLED: "neutral", EXPIRED: "neutral" };

export const LINE_LABEL: Record<string, string> = {
  RESOURCE: "Ressource",
  ENTITLEMENT: "Droit d'abonnement ou pass",
  BILLABLE: "Facturable",
  SERVICE: "Service",
  AMENITY: "Équipement",
  PARTICIPANT: "Participant en plus",
  DEPOSIT: "Caution",
  OVERRUN: "Dépassement",
  NO_SHOW: "Non-présentation",
  DISCOUNT: "Remise",
  FEE: "Frais",
};

export const label = (map: Record<string, string>, key?: string | null): string => (key ? map[key] ?? key : "");

export const BookingStatusChip: React.FC<{ status?: string }> = ({ status }) =>
  status ? <StatusChip tone={STATUS_TONE[status] ?? "neutral"}>{label(STATUS_LABEL, status)}</StatusChip> : null;

export const PaymentChip: React.FC<{ status?: string; text?: string }> = ({ status, text }) =>
  status ? <StatusChip tone={PAYMENT_STATUS_TONE[status] ?? "neutral"}>{text || status}</StatusChip> : null;

export const money = (n?: number | null, currency = "XAF") => (n == null ? "" : formatMoney(n, currency));

/** Les statuts à partir desquels chaque action est proposée (README booking, « Boutons selon le statut »). */
export const CAN = {
  confirm: ["DRAFT", "PENDING_PAYMENT"],
  approve: ["PENDING_APPROVAL"],
  reject: ["PENDING_APPROVAL"],
  checkIn: ["CONFIRMED", "IN_PROGRESS"],
  start: ["CONFIRMED"],
  checkOut: ["IN_PROGRESS"],
  complete: ["CONFIRMED", "IN_PROGRESS"],
  noShow: ["CONFIRMED", "IN_PROGRESS"],
  reschedule: ["CONFIRMED", "PENDING_APPROVAL", "PENDING_PAYMENT"],
  changeResource: ["CONFIRMED"],
  transfer: ["DRAFT", "PENDING_PAYMENT", "PENDING_APPROVAL", "CONFIRMED"],
  cancel: ["DRAFT", "PENDING_PAYMENT", "PENDING_APPROVAL", "CONFIRMED", "IN_PROGRESS"],
  extend: ["CONFIRMED", "IN_PROGRESS"],
  live: ["DRAFT", "PENDING_APPROVAL", "PENDING_PAYMENT", "CONFIRMED", "IN_PROGRESS"],
} as const;

type ApiErr = { response?: { status?: number; data?: { message?: string; reason?: string; errorCode?: string; errors?: string[] } } };

/** `reason` ou `errorCode` du serveur : à tester pour une logique d'écran, jamais le texte. */
export const errorReason = (e: unknown): string | undefined => (e as ApiErr)?.response?.data?.reason ?? (e as ApiErr)?.response?.data?.errorCode;
export const errorStatus = (e: unknown): number | undefined => (e as ApiErr)?.response?.status;
/** Liste détaillée (VALIDATION_FAILED du lot multi-ressources, par exemple). */
export const errorList = (e: unknown): string[] => (e as ApiErr)?.response?.data?.errors ?? [];
export const errorText = (e: unknown, fallback: string): string => (e as ApiErr)?.response?.data?.message ?? fallback;

/** Listes de choix et valeurs fixes du module, en un appel (GET /bookings/reference). */
export const useBookingReference = () =>
  useQuery<BookingReference>({ queryKey: ["booking-reference"], queryFn: () => bookingService.getReference(), staleTime: 5 * 60_000 });

export const refList = (ref: BookingReference | undefined, code: string): ReferenceValue[] =>
  (ref?.lists?.[code] ?? []).filter((v) => v.active !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

/** Aujourd'hui en AAAA-MM-JJ, heure locale de la machine. */
export const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const monthIso = (): string => todayIso().slice(0, 7);

export const hm = (iso?: string | null): string => (iso ? String(iso).slice(11, 16) : "");

/** Motif : liste de codes du serveur + précision libre (OTHER exige un texte). */
export const ReasonSelect: React.FC<{
  values: ReferenceValue[];
  code: string;
  text: string;
  onCode: (c: string) => void;
  onText: (t: string) => void;
  required?: boolean;
}> = ({ values, code, text, onCode, onText, required }) => {
  const current = values.find((v) => v.code === code);
  return (
    <div className="space-y-3">
      <select value={code} onChange={(e) => onCode(e.target.value)} className={FIELD} aria-label="Motif">
        <option value="">{required ? "Choisir un motif" : "Aucun motif"}</option>
        {values.map((v) => (
          <option key={v.code} value={v.code}>
            {v.label}
          </option>
        ))}
      </select>
      {(current?.requiresText || code === "OTHER" || values.length === 0) && (
        <textarea
          value={text}
          onChange={(e) => onText(e.target.value)}
          rows={2}
          placeholder="Précision"
          className={`${FIELD} resize-none`}
        />
      )}
    </div>
  );
};

/** Un seul champ pour trouver un membre, un client ou une entreprise (GET /bookings/lookup/owners). */
export const OwnerPicker: React.FC<{
  value: LookupItem | null;
  onChange: (item: LookupItem | null) => void;
  types?: string;
  placeholder?: string;
}> = ({ value, onChange, types, placeholder = "Nom, code, courriel ou téléphone" }) => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(q, 300);
  const box = useRef<HTMLDivElement>(null);
  const query = useQuery({
    queryKey: ["booking-owner-lookup", debounced, types],
    queryFn: () => bookingService.lookupOwners({ q: debounced, types, size: 20 }),
    enabled: open && debounced.trim().length >= 2,
  });

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{value.label}</p>
          <p className="truncate text-xs text-gray-500">
            {label(OWNER_LABEL, value.type)} · {value.code}
            {value.hint ? ` · ${value.hint}` : ""}
          </p>
        </div>
        <button type="button" aria-label="Changer" onClick={() => onChange(null)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700">
          <X size={16} />
        </button>
      </div>
    );
  }

  const list = query.data?.data ?? [];
  return (
    <div ref={box} className="relative">
      <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={`${FIELD} pl-10`}
      />
      {open && debounced.trim().length >= 2 && (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-lg">
          {query.isLoading ? (
            <p className="px-3 py-2 text-sm text-gray-500">Recherche…</p>
          ) : list.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">Aucun résultat.</p>
          ) : (
            list.map((it) => (
              <button
                key={`${it.type}-${it.code}`}
                type="button"
                onClick={() => {
                  onChange(it);
                  setOpen(false);
                  setQ("");
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-gray-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gray-900">{it.label}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {it.code}
                    {it.hint ? ` · ${it.hint}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-gray-400">{label(OWNER_LABEL, it.type)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

/** Traduit un titulaire choisi en champs de requête (memberId, customerId ou businessCode). */
export const ownerFields = (o: LookupItem | null) =>
  !o ? {} : o.type === "MEMBER" ? { memberId: o.code } : o.type === "CUSTOMER" ? { customerId: o.code } : { businessCode: o.code };

/** Liste d'erreurs affichée sous un formulaire (une ligne par réservation impossible). */
export const ErrorLines: React.FC<{ message?: string | null; lines?: string[] }> = ({ message, lines = [] }) =>
  message || lines.length ? (
    <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">
      {message && <p className="font-semibold">{message}</p>}
      {lines.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  ) : null;
