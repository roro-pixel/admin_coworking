import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Search,
  Target,
  X,
  Loader2,
} from "lucide-react";
import { operationsService } from "../../services/operations.service";
import { bookingService } from "../../services/booking.service";
import { inventoryService } from "../../services/inventory.service";
import type { Lead } from "../../services/operations.service";
import type { BookingResponse } from "../../services/booking.service";
import type { Alert } from "../../services/inventory.service";

export type TaskSourceType = "" | "CRM_LEAD" | "BOOKING" | "INVENTORY";

type SourceResult = {
  code: string;
  label: string;
  description?: string;
  sourceType: Exclude<TaskSourceType, "">;
};

interface TaskSourceAutocompleteProps {
  sourceType: TaskSourceType | string;
  value: string;
  onChange: (sourceCode: string) => void;
  placeholder?: string;
}

const normalize = (value?: string) => (value || "").toLowerCase();

export const TaskSourceAutocomplete: React.FC<TaskSourceAutocompleteProps> = ({
  sourceType,
  value,
  onChange,
  placeholder = "Rechercher le code source...",
}) => {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<SourceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value || ""), [value]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      )
        setShowResults(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const run = async () => {
      const st = sourceType as TaskSourceType;
      if (!st || query.trim().length < 2) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        if (st === "CRM_LEAD") {
          const data = await operationsService.getLeads({
            searchText: query.trim(),
            size: 10,
            page: 0,
          });
          setResults(
            (data.content || []).map((lead: Lead) => ({
              sourceType: "CRM_LEAD",
              code: lead.leadNumber,
              label: lead.fullName,
              description: [lead.company, lead.email, lead.stage]
                .filter(Boolean)
                .join(" · "),
            })),
          );
        } else if (st === "BOOKING") {
          const data = await bookingService.searchBookings(query.trim());
          setResults(
            (data || []).slice(0, 10).map((booking: BookingResponse) => ({
              sourceType: "BOOKING",
              code: booking.bookingNumber,
              label: booking.resourceName || booking.bookingNumber,
              description: [
                booking.ownerName || booking.ownerCode,
                booking.status,
                booking.startedAt
                  ? new Date(booking.startedAt).toLocaleString("fr-FR")
                  : "",
              ]
                .filter(Boolean)
                .join(" · "),
            })),
          );
        } else if (st === "INVENTORY") {
          const data = await inventoryService.getAlerts({
            status: "OPEN",
            size: 50,
          });
          const items = data.content || [];
          const q = normalize(query);
          setResults(
            items
              .filter(
                (alert: Alert) =>
                  normalize(alert.alertCode).includes(q) ||
                  normalize(alert.itemName).includes(q) ||
                  normalize(alert.message).includes(q),
              )
              .slice(0, 10)
              .map((alert: Alert) => ({
                sourceType: "INVENTORY",
                code: alert.alertCode,
                label: alert.itemName || alert.alertCode,
                description: [
                  alert.alertType,
                  alert.locationName,
                  alert.message,
                ]
                  .filter(Boolean)
                  .join(" · "),
              })),
          );
        }
        setShowResults(true);
      } catch (error) {
        console.error("Erreur recherche source tâche", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [query, sourceType]);

  const change = (next: string) => {
    setQuery(next);
    onChange(next);
  };

  const select = (item: SourceResult) => {
    setQuery(item.code);
    onChange(item.code);
    setShowResults(false);
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    onChange("");
  };

  const icon =
    sourceType === "BOOKING" ? (
      <CalendarDays size={16} className="text-blue-600" />
    ) : sourceType === "INVENTORY" ? (
      <AlertTriangle size={16} className="text-orange-600" />
    ) : (
      <Target size={16} className="text-primary-600" />
    );

  if (!sourceType) {
    return (
      <input
        value=""
        disabled
        placeholder="Sélectionnez d’abord un type de source"
        className="px-3 py-2 border rounded-lg bg-gray-50 text-gray-400"
      />
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={query}
          onChange={(e) => change(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
        />
        {isLoading ? (
          <Loader2
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
          />
        ) : query ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((item) => (
            <button
              key={`${item.sourceType}-${item.code}`}
              type="button"
              onClick={() => select(item)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-0"
            >
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {item.code}
                  {item.description ? ` · ${item.description}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
