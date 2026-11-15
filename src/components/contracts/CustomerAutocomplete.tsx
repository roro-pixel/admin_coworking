import React, { useState, useEffect, useRef } from "react";
import { Search, X, Building2 } from "lucide-react";
import { customerService } from "../../services/customer.service";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import { Dots } from "../ui/Toaster";
import { FIELD, FOCUS } from "../subscription/kitUtils";

interface CustomerAutocompleteProps {
  onSelect: (customer: CustomerSummaryResponse | null) => void;
  selectedCustomer?: CustomerSummaryResponse | null;
  placeholder?: string;
}

export const CustomerAutocomplete: React.FC<CustomerAutocompleteProps> = ({
  onSelect,
  selectedCustomer,
  placeholder = "Rechercher un customer...",
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
        const data = await customerService.searchCustomers(query);
        setResults(
          Array.isArray(data)
            ? data
            : (data as any)?.content || (data as any)?.data || [],
        );
        setShowResults(true);
      } catch (error) {
        console.error(error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };
    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (customer: CustomerSummaryResponse) => {
    setQuery(customer.displayName);
    setShowResults(false);
    onSelect(customer);
  };

  const handleClear = () => {
    setQuery("");
    onSelect(null);
    setShowResults(false);
  };

  useEffect(() => {
    if (selectedCustomer) {
      setQuery(selectedCustomer.displayName);
    } else {
      setQuery("");
    }
  }, [selectedCustomer]);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className={`${FIELD} pl-10 pr-10`}
        />
        {query && (
          <button
            type="button"
            aria-label="Effacer"
            onClick={handleClear}
            className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 ${FOCUS}`}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="absolute z-20 mt-2 flex w-full justify-center rounded-2xl bg-white p-4 shadow-lg ring-1 ring-gray-100">
          <Dots />
        </div>
      )}

      {!isLoading && showResults && (
        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-gray-100">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-500">Aucun résultat</p>
          ) : (
            results.map((customer) => (
              <button
                key={customer.customerId}
                type="button"
                onClick={() => handleSelect(customer)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-gray-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <Building2 size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900">{customer.displayName}</span>
                  <span className="block truncate text-xs text-gray-500">{customer.email}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-gray-400">{customer.customerId}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
