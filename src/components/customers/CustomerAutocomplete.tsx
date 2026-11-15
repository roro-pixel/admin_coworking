import React, { useState, useEffect, useRef } from "react";
import { Search, X, Building2, User } from "lucide-react";
import { customerService } from "../../services/customer.service";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import { brandVars } from "../layout/adminTheme";
import { Skeleton } from "../ui/Skeleton";

interface CustomerAutocompleteProps {
  onSelect: (customer: CustomerSummaryResponse | null) => void;
  selectedCustomer?: CustomerSummaryResponse | null;
  typeFilter?: "PERSON" | "COMPANY";
  placeholder?: string;
  required?: boolean;
}

export const CustomerAutocomplete: React.FC<CustomerAutocompleteProps> = ({
  onSelect,
  selectedCustomer,
  typeFilter,
  placeholder = "Rechercher un customer...",
  required = false,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSummaryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const searchCustomers = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await customerService.searchCustomers(query, typeFilter);
        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error("Erreur recherche customers", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [query, typeFilter]);

  const handleSelect = (customer: CustomerSummaryResponse) => {
    setQuery(customer.displayName);
    setShowResults(false);
    onSelect(customer);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    onSelect(null);
    setShowResults(false);
  };

  const Icon = typeFilter === "COMPANY" ? Building2 : User;

  return (
    <div ref={wrapperRef} className="relative w-full" style={brandVars}>
      <div className="relative w-full">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className={`w-full rounded-2xl border bg-white py-2.5 shadow-sm pl-11 pr-10 text-sm text-gray-900 placeholder:text-gray-400 transition focus:bg-white focus:outline-none focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--logo-pink)_20%,white)] ${
            required && !selectedCustomer
              ? "border-red-200 focus:border-red-300"
              : "border-transparent focus:border-[color:var(--logo-pink)]"
          }`}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Effacer"
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="absolute z-30 mt-2 w-full space-y-1 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl shadow-gray-900/10">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-2.5 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-30 mt-2 max-h-72 w-full space-y-0.5 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl shadow-gray-900/10">
          {results.map((customer) => (
            <button
              type="button"
              key={customer.customerId}
              onClick={() => handleSelect(customer)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_10%,white)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] text-[color:var(--logo-pink-dark)]">
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gray-900">{customer.displayName}</span>
                <span className="block truncate text-xs text-gray-500">{customer.email}</span>
              </span>
              <span className="hidden shrink-0 text-right sm:block">
                <span className="block truncate font-mono text-[11px] text-gray-400">{customer.customerId}</span>
                <span
                  className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    customer.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {customer.status}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedCustomer && (
        <div className="mt-2 rounded-2xl bg-[color:color-mix(in_srgb,var(--logo-pink)_12%,white)] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[color:var(--logo-pink-dark)]">Customer sélectionné</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{selectedCustomer.displayName}</p>
              <p className="truncate text-xs text-gray-500">
                {selectedCustomer.customerId} • {selectedCustomer.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              aria-label="Retirer la sélection"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-white/70 hover:text-gray-700"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};