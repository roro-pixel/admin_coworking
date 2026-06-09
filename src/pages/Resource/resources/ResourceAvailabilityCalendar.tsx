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

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const addMonths = (month: string, delta: number): string => {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m - 1 + delta, 1);
  return d.toISOString().slice(0, 7);
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

export const ResourceAvailabilityCalendar: React.FC<
  ResourceAvailabilityCalendarProps
> = ({ month, onMonthChange, slots, closures = [] }) => {
  const days = getMonthDays(month);

  const slotsByDay = React.useMemo(() => {
    const map: Record<string, ResourceAvailabilityResponse[]> = {};
    slots.forEach((slot) => {
      const key = slot.startedAt.slice(0, 10);
      map[key] = map[key] || [];
      map[key].push(slot);
    });
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

    if (dayClosures.length > 0) {
      return {
        label: "Fermé",
        className: "bg-gray-100 text-gray-600 border-gray-200",
        count: dayClosures.length,
      };
    }
    if (daySlots.length === 0) {
      return {
        label: "Aucun créneau",
        className: "bg-white text-gray-400 border-gray-100",
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
        className: "bg-red-50 text-red-700 border-red-200",
        count: daySlots.length,
      };
    }
    if (remainingCapacity < totalCapacity) {
      return {
        label: "Partiel",
        className: "bg-orange-50 text-orange-700 border-orange-200",
        count: daySlots.length,
      };
    }
    return {
      label: "Disponible",
      className: "bg-green-50 text-green-700 border-green-200",
      count: daySlots.length,
    };
  };

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-primary-600" />
          <h3 className="font-semibold">Calendrier des disponibilités</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMonthChange(addMonths(month, -1))}
            className="p-2 border rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft size={16} />
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <button
            onClick={() => onMonthChange(addMonths(month, 1))}
            className="p-2 border rounded-lg hover:bg-gray-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 bg-gray-50 border-b text-xs font-medium text-gray-500">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="px-3 py-2 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((date) => {
          const key = toDateKey(date);
          const dayStatus = getDayStatus(date);
          const isCurrentMonth = key.startsWith(month);
          return (
            <div
              key={key}
              className={`min-h-[110px] border-r border-b p-2 ${isCurrentMonth ? "bg-white" : "bg-gray-50 opacity-60"}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium">{date.getDate()}</span>
                {dayStatus.count > 0 && (
                  <span className="text-[11px] text-gray-400">
                    {dayStatus.count}
                  </span>
                )}
              </div>
              <div
                className={`border rounded-lg px-2 py-1 text-xs ${dayStatus.className}`}
              >
                {dayStatus.label}
              </div>
              {(slotsByDay[key] || []).slice(0, 3).map((slot) => (
                <div
                  key={slot.id}
                  className="mt-1 text-[11px] text-gray-500 truncate"
                >
                  {slot.startedAt.slice(11, 16)}-{slot.endedAt.slice(11, 16)} ·{" "}
                  {slot.remainingCapacity}/{slot.totalCapacity}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 p-4 border-t text-xs">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-100 border border-green-200" />
          Disponible
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-100 border border-orange-200" />
          Partiel
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-100 border border-red-200" />
          Complet
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
          Fermeture
        </span>
      </div>
    </div>
  );
};
