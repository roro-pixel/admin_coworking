import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ResourceAvailabilityResponse, ResourceClosureResponse } from "../../../services/resource.service";
import { FIELD_SOFT } from "../../../components/subscription/kitUtils";

interface ResourceAvailabilityCalendarProps {
  month: string;
  onMonthChange: (month: string) => void;
  slots: ResourceAvailabilityResponse[];
  closures?: ResourceClosureResponse[];
  /** Appelé quand on touche un jour, pour proposer une action (créer un créneau, par exemple) */
  onDayClick?: (dateKey: string) => void;
}

const pad2 = (value: number): string => String(value).padStart(2, "0");
const toDateKey = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const toMonthKey = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
const addMonths = (month: string, delta: number): string => {
  const [year, m] = month.split("-").map(Number);
  return toMonthKey(new Date(year, m - 1 + delta, 1));
};
const getMonthDays = (month: string): Date[] => {
  const [year, m] = month.split("-").map(Number);
  const first = new Date(year, m - 1, 1);
  const last = new Date(year, m, 0);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const end = new Date(last);
  end.setDate(last.getDate() + (6 - ((last.getDay() + 6) % 7)));
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};
const monthLabel = (month: string) => {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

type DayState = "past" | "closed" | "empty" | "full" | "partial" | "free";
const STATE: Record<DayState, { label: string; cell: string; dot: string }> = {
  past: { label: "Bouclé", cell: "bg-gray-50 text-gray-400", dot: "bg-gray-300" },
  closed: { label: "Fermé", cell: "bg-gray-100 text-gray-500", dot: "bg-gray-500" },
  empty: { label: "Libre à créer", cell: "bg-white text-gray-400 ring-1 ring-inset ring-gray-100", dot: "bg-gray-200" },
  full: { label: "Complet", cell: "bg-red-50 text-red-700", dot: "bg-red-500" },
  partial: { label: "Partiel", cell: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  free: { label: "Disponible", cell: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
};

export const ResourceAvailabilityCalendar: React.FC<ResourceAvailabilityCalendarProps> = ({ month, onMonthChange, slots, closures = [], onDayClick }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const days = useMemo(() => getMonthDays(month), [month]);
  const todayKey = toDateKey(new Date());

  const slotsByDay = useMemo(() => {
    const map: Record<string, ResourceAvailabilityResponse[]> = {};
    slots.forEach((slot) => {
      const key = slot.startedAt.slice(0, 10);
      (map[key] = map[key] || []).push(slot);
    });
    Object.values(map).forEach((items) => items.sort((a, b) => a.startedAt.localeCompare(b.startedAt)));
    return map;
  }, [slots]);

  // Une fermeture couvre tous les jours de son début à sa fin
  const closureByDay = useMemo(() => {
    const map: Record<string, ResourceClosureResponse[]> = {};
    closures.forEach((c) => {
      const a = new Date(c.startedAt.slice(0, 10));
      const b = new Date(c.endedAt.slice(0, 10));
      for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        (map[key] = map[key] || []).push(c);
      }
    });
    return map;
  }, [closures]);

  const info = (key: string) => {
    const daySlots = slotsByDay[key] || [];
    const total = daySlots.reduce((s, x) => s + (x.totalCapacity || 0), 0);
    const left = daySlots.reduce((s, x) => s + (x.remainingCapacity || 0), 0);
    let state: DayState;
    if (key < todayKey) state = "past";
    else if ((closureByDay[key] || []).length > 0) state = "closed";
    else if (daySlots.length === 0) state = "empty";
    else if (left <= 0) state = "full";
    else if (left < total) state = "partial";
    else state = "free";
    return { state, daySlots, total, left };
  };

  const sel = selected ? info(selected) : null;
  const selClosures = selected ? closureByDay[selected] || [] : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold capitalize text-gray-950">{monthLabel(month)}</h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onMonthChange(addMonths(month, -1))} aria-label="Mois précédent" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200">
            <ChevronLeft size={16} />
          </button>
          <input type="month" value={month} onChange={(e) => e.target.value && onMonthChange(e.target.value)} aria-label="Mois affiché" className={`${FIELD_SOFT} !w-auto`} />
          <button type="button" onClick={() => onMonthChange(addMonths(month, 1))} aria-label="Mois suivant" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div>
        <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-gray-400">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((date) => {
            const key = toDateKey(date);
            const inMonth = key.startsWith(month);
            const { state, daySlots, total, left } = info(key);
            const s = STATE[state];
            const isToday = key === todayKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelected(selected === key ? null : key);
                  onDayClick?.(key);
                }}
                aria-label={`${key}, ${s.label}`}
                className={`flex min-h-[3.5rem] flex-col items-start justify-between rounded-xl p-1.5 text-left transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)] sm:min-h-[5.5rem] sm:rounded-2xl sm:p-2.5 ${s.cell} ${inMonth ? "" : "opacity-40"} ${selected === key ? "ring-2 ring-[color:var(--logo-pink-dark)]" : ""}`}
              >
                <span className="flex w-full items-center justify-between">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold sm:h-7 sm:w-7 sm:text-sm ${isToday ? "bg-[color:var(--logo-pink-dark)] text-white" : ""}`}>{date.getDate()}</span>
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                </span>
                {daySlots.length > 0 && state !== "closed" && (
                  <span className="hidden text-[11px] font-semibold sm:block">
                    {left}/{total} places
                  </span>
                )}
                {state === "closed" && <span className="hidden text-[11px] font-semibold sm:block">Fermé</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
        {(["free", "partial", "full", "closed", "past"] as DayState[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${STATE[k].dot}`} />
            {STATE[k].label}
          </span>
        ))}
      </div>

      {selected && sel && (
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-sm font-bold capitalize text-gray-900">{new Date(selected).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
          <p className="mt-0.5 text-xs text-gray-500">{STATE[sel.state].label}</p>
          {selClosures.map((c) => (
            <p key={c.id} className="mt-2 text-sm text-gray-700">
              Fermeture{c.reason ? ` : ${c.reason}` : ""} ({c.startedAt.slice(11, 16)} à {c.endedAt.slice(11, 16)})
            </p>
          ))}
          {sel.daySlots.length === 0 && selClosures.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">Aucun créneau ce jour-là.</p>
          ) : (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {sel.daySlots.map((slot) => (
                <li key={slot.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
                  <span className="font-semibold text-gray-800">
                    {slot.slotDurationMinutes === 0 ? "Journée entière" : `${slot.startedAt.slice(11, 16)} - ${slot.endedAt.slice(11, 16)}`}
                  </span>
                  <span className="text-gray-500">
                    {slot.remainingCapacity}/{slot.totalCapacity} places
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
