import React from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import type {
  ResourceAvailabilityResponse,
  ResourceClosureResponse,
} from "../../../services/resource.service";

interface ResourceAvailabilityCalendarProps {
  month: string;
  onMonthChange: (month: string) => void;
  slots: ResourceAvailabilityResponse[];
  closures?: ResourceClosureResponse[];
}

const pad2 = (value: number): string => String(value).padStart(2, "0");

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const toMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;

const addMonths = (month: string, delta: number): string => {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m - 1 + delta, 1);
  return toMonthKey(d);
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
  return new Date(year, m - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
};

export const ResourceAvailabilityCalendar: React.FC<
  ResourceAvailabilityCalendarProps
> = ({ month, onMonthChange, slots, closures = [] }) => {
  const days = getMonthDays(month);
  const todayKey = toDateKey(new Date());

  const slotsByDay = React.useMemo(() => {
    const map: Record<string, ResourceAvailabilityResponse[]> = {};
    slots.forEach((slot) => {
      const key = slot.startedAt.slice(0, 10);
      map[key] = map[key] || [];
      map[key].push(slot);
    });
    Object.values(map).forEach((items) =>
      items.sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
    );
    return map;
  }, [slots]);

  const closuresByDay = React.useMemo(() => {
    const map: Record<string, ResourceClosureResponse[]> = {};
    closures.forEach((closure) => {
      const key = closure.startedAt.slice(0, 10);
      map[key] = map[key] || [];
      map[key].push(closure);
    });
    return map;
  }, [closures]);

  const getDayStatus = (date: Date) => {
    const key = toDateKey(date);
    const daySlots = slotsByDay[key] || [];
    const dayClosures = closuresByDay[key] || [];
    const isPastDay = key < todayKey;

    if (isPastDay) {
      return {
        label: "Bouclé",
        dot: "bg-slate-400",
        badge: "bg-slate-100 text-slate-600",
        ring: "ring-slate-100",
        count: daySlots.length || dayClosures.length,
      };
    }

    if (dayClosures.length > 0) {
      return {
        label: "Fermé",
        dot: "bg-gray-400",
        badge: "bg-gray-100 text-gray-600",
        ring: "ring-gray-100",
        count: dayClosures.length,
      };
    }
    if (daySlots.length === 0) {
      return {
        label: "Libre à créer",
        dot: "bg-gray-200",
        badge: "bg-gray-50 text-gray-400",
        ring: "ring-gray-100",
        count: 0,
      };
    }

    const totalCapacity = daySlots.reduce(
      (sum, s) => sum + (s.totalCapacity || 0),
      0,
    );
    const remainingCapacity = daySlots.reduce(
      (sum, s) => sum + (s.remainingCapacity || 0),
      0,
    );

    if (remainingCapacity <= 0) {
      return {
        label: "Complet",
        dot: "bg-red-500",
        badge: "bg-red-50 text-red-700",
        ring: "ring-red-100",
        count: daySlots.length,
      };
    }
    if (remainingCapacity < totalCapacity) {
      return {
        label: "Partiel",
        dot: "bg-orange-500",
        badge: "bg-orange-50 text-orange-700",
        ring: "ring-orange-100",
        count: daySlots.length,
      };
    }
    return {
      label: "Disponible",
      dot: "bg-green-500",
      badge: "bg-green-50 text-green-700",
      ring: "ring-green-100",
      count: daySlots.length,
    };
  };

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className="flex flex-col gap-4 bg-white p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <CalendarDays size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold capitalize text-gray-900">
              {monthLabel(month)}
            </h3>
            <p className="text-sm text-gray-500">
              Vue mensuelle des créneaux, fermetures et capacités restantes.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, -1))}
            className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50"
            aria-label="Mois précédent"
          >
            <ChevronLeft size={16} />
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
          />
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, 1))}
            className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50"
            aria-label="Mois suivant"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 bg-gray-50/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-100 p-px">
        {days.map((date) => {
          const key = toDateKey(date);
          const dayStatus = getDayStatus(date);
          const isCurrentMonth = key.startsWith(month);
          const isToday = key === todayKey;
          const isPastDay = key < todayKey;
          const daySlots = slotsByDay[key] || [];
          const totalRemaining = daySlots.reduce(
            (sum, slot) => sum + (slot.remainingCapacity || 0),
            0,
          );
          const totalCapacity = daySlots.reduce(
            (sum, slot) => sum + (slot.totalCapacity || 0),
            0,
          );

          return (
            <div
              key={key}
              className={`min-h-[132px] bg-white p-2.5 transition hover:bg-primary-50/30 ${
                !isCurrentMonth ? "opacity-45" : ""
              } ${isPastDay ? "bg-slate-50/60" : ""}`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                    isToday ? "bg-primary-600 text-white" : "text-gray-800"
                  }`}
                >
                  {date.getDate()}
                </span>
                {dayStatus.count > 0 && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                    {dayStatus.count}
                  </span>
                )}
              </div>

              <div
                className={`mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${dayStatus.badge} ${dayStatus.ring}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dayStatus.dot}`} />
                <span className="truncate">{dayStatus.label}</span>
              </div>

              {daySlots.length > 0 && (
                <div className="mb-2 rounded-xl bg-gray-50 px-2 py-1.5 text-[11px] text-gray-600">
                  Capacité : <span className="font-semibold">{totalRemaining}</span> / {totalCapacity}
                </div>
              )}

              <div className="space-y-1">
                {daySlots.slice(0, 3).map((slot) => (
                  <div
                    key={slot.id}
                    className="truncate rounded-lg bg-white px-2 py-1 text-[11px] text-gray-500 ring-1 ring-gray-100"
                  >
                    {slot.startedAt.slice(11, 16)}–{slot.endedAt.slice(11, 16)} · {slot.remainingCapacity}/{slot.totalCapacity}
                  </div>
                ))}
                {daySlots.length > 3 && (
                  <div className="text-[11px] font-medium text-primary-600">
                    +{daySlots.length - 3} autre{daySlots.length - 3 > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 bg-gray-50/70 p-4 text-xs text-gray-600">
        {[
          ["bg-green-500", "Disponible"],
          ["bg-orange-500", "Partiel"],
          ["bg-red-500", "Complet"],
          ["bg-slate-400", "Bouclé"],
          ["bg-gray-400", "Fermeture"],
        ].map(([color, label]) => (
          <span key={label} className="inline-flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};
